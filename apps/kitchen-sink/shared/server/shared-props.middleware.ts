import { Injectable, type NestMiddleware } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { defer, requestState, type AnyRequest } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { Note } from './database/entities/note.entity'
import type { User } from './database/entities/user.entity'

/**
 * Shares the logged-in user's recent notes on every page, next to the
 * `auth.user` that nestjs-mvc adds from `auth.share` (the two merge into one
 * `auth` object).
 *
 * Middleware runs before guards, so `req.user` is not set yet here. That is
 * why the notes are a closure: it runs when the page renders, after the guard
 * has put the user on the request — and, being deferred, only when the client
 * asks for it after the first paint.
 */
@Injectable()
export class SharedPropsMiddleware implements NestMiddleware {
  constructor(@InjectRepository(Note) private readonly notes: Repository<Note>) {}

  use(req: AnyRequest, _res: unknown, next: () => void): void {
    requestState(req).shared.auth = {
      // A deferred prop nested inside a shared prop: announced as
      // `auth.notifications` and fetched by the client after the first paint.
      notifications: defer(async () => {
        const user = (req as AnyRequest & { user?: User }).user
        if (!user) return []
        const notes = await this.notes.find({ where: { userId: user.id }, order: { createdAt: 'DESC' }, take: 5 })
        return notes.map((note) => ({ id: note.id, body: note.body, createdAt: note.createdAt }))
      }),
    }
    next()
  }
}
