import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { HEADER_XSRF_TOKEN, XSRF_COOKIE } from '../protocol/constants'
import { type AnyRequest, type AnyResponse, header, readCookie, requestMethod, requestOrigin, writeCookie } from './http'
import type { KeyRing } from './keys'
import { MVC_KEYS, MVC_MODULE_OPTIONS, MVC_SKIP_CSRF_METADATA } from './tokens'
import type { MvcModuleOptions } from './types'

/** Signing purpose of the CSRF token; see `KeyRing`. */
const CSRF_PURPOSE = 'csrf'

/** Methods that must not change anything, so they need no protection (and get the token). */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** How CSRF protection runs, as `MvcModuleOptions.csrf` resolves; `undefined` means off. */
export interface CsrfSettings {
  /** Also require the `XSRF-TOKEN` / `X-XSRF-TOKEN` pair, on top of the origin check. */
  token: boolean
}

/**
 * On unless the module says `csrf: false`. Also off under a test runner
 * (`NODE_ENV=test`) unless the module asks for it explicitly, as Laravel does:
 * an app's supertest suite posts without a browser, and would otherwise need
 * a token on every request. `csrf: true` or `csrf: { … }` turns it on there too.
 */
export function csrfSettings(option: MvcModuleOptions['csrf'], env: NodeJS.ProcessEnv = process.env): CsrfSettings | undefined {
  if (option === false) return undefined
  if (option === undefined && env.NODE_ENV === 'test') return undefined
  return { token: typeof option === 'object' ? option.token ?? true : true }
}

/**
 * Turns CSRF protection off for a handler, or for every handler of a
 * controller: webhooks, payment-provider callbacks and machine-to-machine
 * endpoints that authenticate with a signature or a bearer token instead of a
 * cookie. `@SkipCsrf(false)` on a handler turns it back on inside a skipped
 * controller.
 */
export const SkipCsrf = (skip = true): MethodDecorator & ClassDecorator => SetMetadata(MVC_SKIP_CSRF_METADATA, skip)

/** 419, as Laravel answers it: the token is missing, wrong, or from an old key. Retrying works. */
export class CsrfTokenMismatchException extends HttpException {
  constructor() {
    super({ statusCode: 419, message: 'CSRF token mismatch.', error: 'Page Expired' }, 419)
  }
}

/** 403: the browser said the request comes from another site. */
export class CrossSiteRequestException extends ForbiddenException {
  constructor() {
    super('Cross-site request refused.')
  }
}

/**
 * Protection against cross-site request forgery, in two layers, both
 * stateless:
 *
 * 1. **The origin.** A request that changes something (not GET/HEAD/OPTIONS)
 *    must come from this app: `Sec-Fetch-Site: same-origin` (or `none`), or,
 *    from a browser too old to send that header, an `Origin` equal to this
 *    app's. Without either header it is not a browser, and layer 2 decides.
 *    This is the algorithm of Go's `http.CrossOriginProtection`.
 * 2. **The token.** Every response to a request without a valid `XSRF-TOKEN`
 *    cookie sets one: a random value signed with the app's keys, readable by
 *    JavaScript. The client echoes it as `X-XSRF-TOKEN`; a request that
 *    changes something must carry the header, equal to the cookie, with a
 *    valid signature. Nothing is stored on the server.
 *
 * A guard rather than a middleware so `@SkipCsrf()` on the handler can be
 * read, and so Precognition's validate-only requests are covered too.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly settings: CsrfSettings | undefined

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(MVC_KEYS) private readonly keys: KeyRing,
  ) {
    this.settings = csrfSettings(options.csrf)
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.settings || context.getType() !== 'http') return true
    const skip = this.reflector.getAllAndOverride<boolean | undefined>(MVC_SKIP_CSRF_METADATA, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skip) return true

    const http = context.switchToHttp()
    const req = http.getRequest<AnyRequest>()
    const res = http.getResponse<AnyResponse>()

    if (SAFE_METHODS.has(requestMethod(req))) {
      if (this.settings.token && !this.validCookie(req)) this.issueToken(req, res)
      return true
    }

    if (!this.fromThisApp(req)) throw new CrossSiteRequestException()
    if (this.settings.token && !this.validToken(req)) {
      this.issueToken(req, res)
      throw new CsrfTokenMismatchException()
    }
    return true
  }

  /** Layer 1: what the browser says about where the request comes from. */
  private fromThisApp(req: AnyRequest): boolean {
    const site = header(req, 'sec-fetch-site')
    if (site !== undefined) return site === 'same-origin' || site === 'none'
    const origin = header(req, 'origin')
    if (origin === undefined) return true
    return origin === requestOrigin(req, this.options.url)
  }

  /** Layer 2: the header echoes the cookie, and the cookie is one we signed. */
  private validToken(req: AnyRequest): boolean {
    const cookie = readCookie(req, XSRF_COOKIE)
    const echoed = header(req, HEADER_XSRF_TOKEN)
    if (!cookie || !echoed) return false
    const a = Buffer.from(cookie)
    const b = Buffer.from(echoed)
    return a.length === b.length && timingSafeEqual(a, b) && this.keys.verify(CSRF_PURPOSE, cookie) !== undefined
  }

  private validCookie(req: AnyRequest): boolean {
    const cookie = readCookie(req, XSRF_COOKIE)
    return !!cookie && this.keys.verify(CSRF_PURPOSE, cookie) !== undefined
  }

  private issueToken(req: AnyRequest, res: AnyResponse): void {
    const token = this.keys.sign(CSRF_PURPOSE, randomBytes(32).toString('base64url'))
    // Readable by the client, which copies it into the header; a session cookie,
    // because the token proves nothing about who you are, only where you are.
    writeCookie(res, XSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'Lax',
      secure: requestOrigin(req, this.options.url)?.startsWith('https:') ?? false,
    })
  }
}
