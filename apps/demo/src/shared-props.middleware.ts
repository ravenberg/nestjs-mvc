import { Injectable, type NestMiddleware } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MVC_REQUEST_STATE, type MvcRequestState } from 'nestjs-mvc'
import type { NextFunction, Request, Response } from 'express'
import { Repository } from 'typeorm'
import { User } from './database/entities/user.entity'

/**
 * Stands in for a real auth layer: shares a fixed user on every response, the
 * way Laravel's `HandleInertiaRequests::share()` shares `auth.user`. Sharing
 * happens here rather than in a controller so every page gets it.
 */
@Injectable()
export class SharedPropsMiddleware implements NestMiddleware {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const user = await this.users.findOne({ where: { email: 'test@example.com' } })

    // The Mvc middleware initialises this state; guard in case ordering changes.
    const holder = req as Request & Record<symbol, MvcRequestState | undefined>
    const state = (holder[MVC_REQUEST_STATE] ??= { shared: {} })
    state.shared.auth = { user: user ? { id: user.id, name: user.name, email: user.email } : null }

    next()
  }
}
