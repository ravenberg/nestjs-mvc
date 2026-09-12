import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common'
import type { User } from '../database/entities/user.entity'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Opens a route, or every route of a controller, to visitors who are not
 * logged in. The guard is global, so everything else requires a login: a
 * forgotten `@Public()` on the login page is found in a minute, a forgotten
 * guard on an admin page in an incident.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

/** The logged-in user, as the guard put it on the request; `undefined` for a guest. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | undefined => context.switchToHttp().getRequest<{ user?: User }>().user,
)
