import { Controller, Get } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { View, defer } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Contact } from '../database/entities/contact.entity'
import { Note } from '../database/entities/note.entity'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Data Loading → Deferred Props. The page paints at once; three props arrive
 * afterwards, in two groups (one follow-up request per group), and one of
 * them fails on purpose: `rescue: true` keeps the failure from taking the
 * others down — it is reported, left out, and listed under `rescuedProps`, so
 * the client's `<Deferred rescue>` slot can show something sensible.
 */
@Controller('features/data-loading')
export class DeferredPropsController {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Note) private readonly notes: Repository<Note>,
  ) {}

  @Get('deferred-props')
  @View('Features/DataLoading/DeferredProps')
  page() {
    return {
      // Default group: both resolve in the same follow-up request.
      contactCount: defer(async () => {
        await sleep(400)
        return this.contacts.count()
      }),
      noteCount: defer(async () => {
        await sleep(400)
        return this.notes.count()
      }),
      // Its own group, so it does not hold the counters back.
      slowReport: defer(
        async () => {
          await sleep(2000)
          const favorites = await this.contacts.count({ where: { isFavorite: true } })
          return { favorites, generatedAt: new Date().toISOString() }
        },
        { group: 'report' },
      ),
      // Simulates an external service that is down. Without `rescue` the whole
      // follow-up request would fail and the counters with it.
      recommendations: defer(
        async () => {
          await sleep(800)
          throw new Error('recommendations service returned 503')
        },
        { rescue: true },
      ),
    }
  }
}
