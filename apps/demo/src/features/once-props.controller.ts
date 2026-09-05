import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ValidationException, View, ViewService, once } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Organization } from '../database/entities/organization.entity'

/**
 * Data Loading → Once Props. `organizations` is resolved on the first visit and
 * then remembered by the client: later visits carry
 * `X-Inertia-Except-Once-Props: organizations`, the closure is not called, and
 * the prop is left out of the response. `serverTime` is a plain prop for
 * contrast — it changes on every visit.
 *
 * Nothing is cached on the server. The only memory is the client's, and the only
 * input is this request's header.
 */
@Controller('features/data-loading')
export class OncePropsController {
  constructor(
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @Inject(ViewService) private readonly view: ViewService,
  ) {}

  @Get('once-props')
  @View('Features/DataLoading/OnceProps')
  onceProps(@Query('fresh') fresh?: string) {
    return {
      serverTime: new Date().toISOString(),
      organizations: once(
        async () => ({
          // Stamped inside the closure, so a cached copy keeps its original stamp.
          resolvedAt: new Date().toISOString(),
          items: (await this.organizations.find({ order: { name: 'ASC' } })).map((organization) => ({
            id: organization.id,
            name: organization.name,
          })),
        }),
        {
          as: 'organizations', // one cache entry, shareable by any page that uses the same key
          until: 300, // seconds; the client drops its copy after five minutes
          fresh: fresh === '1', // `?fresh=1` re-resolves even if the client says it has it
        },
      ),
    }
  }

  /**
   * The mutation that makes the client's copy stale. `refresh()` marks the once
   * key for the next render and `flash()` leaves a message; both travel in the
   * flash bag (a cookie by default) and are consumed by the redirect target.
   */
  @Post('once-props/organizations')
  async store(@Body('name') name?: string) {
    const trimmed = name?.trim() ?? ''
    if (trimmed.length < 2) throw new ValidationException({ name: 'An organization needs a name of at least 2 characters.' })

    await this.organizations.save(this.organizations.create({ name: trimmed }))
    return this.view.flash('message', `Added “${trimmed}”. The dropdown was refreshed.`).refresh('organizations').back()
  }
}
