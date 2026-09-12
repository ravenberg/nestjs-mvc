import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { readCookie, type AnyRequest } from 'nestjs-mvc'
import type { User } from '../database/entities/user.entity'
import { ACCESS_TOKEN_COOKIE, AuthService } from './auth.service'
import { IS_PUBLIC_KEY } from './public.decorator'

/**
 * The NestJS docs' authentication guard, registered globally (`APP_GUARD`),
 * with one change that matters for pages: it **authenticates every request**
 * and only *refuses* where the route is not `@Public()`. The docs' version
 * returns early on public routes, which is fine for an API; here the login
 * page, the feature pages and the 404 all have a sidebar that shows who is
 * logged in. Authentication on every request, authorization per route.
 *
 * The `UnauthorizedException` is all nestjs-mvc needs: a page load or an
 * Inertia visit is sent to `/login` and back afterwards, a JSON client gets
 * the 401.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AnyRequest & { user?: User }>()
    const token = readCookie(req, ACCESS_TOKEN_COOKIE)
    req.user = token ? ((await this.auth.userFromToken(token)) ?? undefined) : undefined

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])
    if (!isPublic && !req.user) throw new UnauthorizedException()
    return true
  }
}
