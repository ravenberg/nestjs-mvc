import { Controller, Get, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { View, optional } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Contact } from '../database/entities/contact.entity'
import { Note } from '../database/entities/note.entity'
import { Organization } from '../database/entities/organization.entity'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const stamp = () => new Date().toISOString()

/**
 * Data Loading: partial reloads, WhenVisible, polling. Every prop carries the
 * time it was resolved, so the page can show *which* props a request touched —
 * no counters on the server, nothing shared between requests.
 */
@Controller('features/data-loading')
export class DataLoadingController {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(Note) private readonly notes: Repository<Note>,
  ) {}

  // ── partial reloads ──────────────────────────────────────────────────────

  @Get('partial-reloads')
  @View('Features/DataLoading/PartialReloads')
  partialReloads() {
    return {
      // Cheap: resolved on every request that asks for it.
      contacts: async () => ({ count: await this.contacts.count(), resolvedAt: stamp() }),
      // Pretend-expensive: a partial reload that leaves it out never runs this.
      stats: async () => {
        await sleep(700)
        const [organizations, notes] = await Promise.all([this.organizations.count(), this.notes.count()])
        return { organizations, notes, resolvedAt: stamp() }
      },
      // Optional: only ever resolved when a reload names it explicitly.
      audit: optional(async () => {
        await sleep(300)
        return { entries: 1234, resolvedAt: stamp() }
      }),
    }
  }

  // ── when visible ─────────────────────────────────────────────────────────

  @Get('when-visible')
  @View('Features/DataLoading/WhenVisible')
  whenVisible() {
    const section = (name: string, ms: number) =>
      optional(async () => {
        await sleep(ms)
        return { name, loadedAt: stamp() }
      })
    return {
      // `optional()`: skipped on the first load; <WhenVisible data="…"> asks
      // for each one with a partial reload when it scrolls into view.
      recent: section('recent activity', 500),
      reports: section('quarterly reports', 900),
      archive: section('archive', 600),
    }
  }

  // ── polling ──────────────────────────────────────────────────────────────

  @Get('polling')
  @View('Features/DataLoading/Polling')
  polling(@Query('interval') interval?: string) {
    const seconds = Math.floor(Date.now() / 1000)
    return {
      interval: Math.max(1000, Number(interval) || 2000),
      metrics: () => ({
        serverTime: stamp(),
        // Derived from the clock, so it changes every poll without any server state.
        activeUsers: 40 + Math.round(20 * Math.sin(seconds / 5)),
        queueDepth: (seconds % 17) + 3,
        resolvedAt: stamp(),
      }),
    }
  }
}
