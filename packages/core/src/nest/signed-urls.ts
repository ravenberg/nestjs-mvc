import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UseGuards,
  applyDecorators,
} from '@nestjs/common'
import { type AnyRequest, requestUrl } from './http'
import type { KeyRing } from './keys'
import { MVC_KEYS, MVC_MODULE_OPTIONS } from './tokens'
import type { MvcModuleOptions } from './types'

/** Signing purpose of a signed URL; see `KeyRing`. */
const SIGNED_URL_PURPOSE = 'signed-url'

/** Query parameters a signed URL carries; everything else in the URL is signed with it. */
export const SIGNATURE_PARAM = 'signature'
export const EXPIRES_PARAM = 'expires'

export interface SignedUrlOptions {
  /** Seconds from now, or the moment it stops working. Without it the link never expires. */
  expiresIn?: number | Date
  /**
   * Something the link belongs to, mixed into the signature but not put in the
   * URL: the recipient's current password hash, say. The value must be
   * recomputable when the link is used, and the link stops working the moment
   * it changes — which is how a password-reset link becomes single-use
   * without a table of tokens.
   */
  bind?: string
}

/** Why a signed URL was refused, for a handler that wants to say something better than "no". */
export type SignatureVerdict = 'valid' | 'expired' | 'invalid'

/** 403, as Laravel answers a bad signature. */
export class InvalidSignatureException extends ForbiddenException {
  constructor(readonly verdict: Exclude<SignatureVerdict, 'valid'> = 'invalid') {
    super(verdict === 'expired' ? 'This link has expired.' : 'This link is not valid.')
  }
}

/**
 * Links that carry their own proof: invites, unsubscribe links, downloads,
 * password resets, email verification — anything that must work without a
 * login and without a table of tokens.
 *
 * The signature covers the path and the query (the parameter order does not
 * matter) plus the expiry, and is made with the app's keys, so nothing is
 * stored on the server. It deliberately does **not** cover the origin: the
 * same link works on every domain the app answers to, and no `Host` header
 * can change what was signed.
 */
@Injectable()
export class SignedUrls {
  constructor(
    @Inject(MVC_KEYS) private readonly keys: KeyRing,
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
  ) {}

  /**
   * A signed link to `path` (a path, with or without a query). Absolute when
   * the module knows the app's `url` — which links in emails need — and a
   * path otherwise.
   *
   * ```ts
   * this.links.sign(`/invitations/${invite.id}`, { expiresIn: 7 * 24 * 3600 })
   * ```
   */
  sign(path: string, options: SignedUrlOptions = {}): string {
    const url = new URL(path, this.options.url ?? 'http://signed.invalid')
    url.searchParams.delete(SIGNATURE_PARAM)
    if (options.expiresIn !== undefined) url.searchParams.set(EXPIRES_PARAM, String(expiryOf(options.expiresIn)))
    url.searchParams.set(SIGNATURE_PARAM, this.keys.digest(SIGNED_URL_PURPOSE, this.payload(url, options.bind)))
    return this.options.url ? url.toString() : `${url.pathname}${url.search}`
  }

  /** Whether this request's URL still carries a valid signature; the reason when it does not. */
  check(target: AnyRequest | string, options: Pick<SignedUrlOptions, 'bind'> = {}): SignatureVerdict {
    const url = new URL(typeof target === 'string' ? target : requestUrl(target), 'http://signed.invalid')
    const signature = url.searchParams.get(SIGNATURE_PARAM)
    if (!signature) return 'invalid'
    url.searchParams.delete(SIGNATURE_PARAM)
    if (signature !== this.keys.digest(SIGNED_URL_PURPOSE, this.payload(url, options.bind))) return 'invalid'

    const expires = url.searchParams.get(EXPIRES_PARAM)
    if (expires && Number(expires) * 1000 <= Date.now()) return 'expired'
    return 'valid'
  }

  /** `check()` as a boolean, for a handler that only wants to know. */
  verify(target: AnyRequest | string, options: Pick<SignedUrlOptions, 'bind'> = {}): boolean {
    return this.check(target, options) === 'valid'
  }

  /** What the signature covers: the path, the query in a fixed order, and whatever it is bound to. */
  private payload(url: URL, bind: string | undefined): string {
    const params = [...url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return JSON.stringify([url.pathname, params, bind ?? null])
  }
}

const expiryOf = (expiresIn: number | Date): number =>
  Math.floor(expiresIn instanceof Date ? expiresIn.getTime() / 1000 : Date.now() / 1000 + expiresIn)

/**
 * Refuses the request when its URL is not signed, or no longer valid, with a
 * 403 — so a handler behind it can trust the URL it was given. For a link
 * bound to something (`bind`), check it in the handler with `SignedUrls`
 * instead: only the handler can work out what it was bound to.
 */
@Injectable()
export class SignedUrlGuard implements CanActivate {
  constructor(@Inject(SignedUrls) private readonly links: SignedUrls) {}

  canActivate(context: ExecutionContext): boolean {
    const verdict = this.links.check(context.switchToHttp().getRequest<AnyRequest>())
    if (verdict !== 'valid') throw new InvalidSignatureException(verdict)
    return true
  }
}

/** `@ValidSignature()` on a handler or controller: the URL must carry a valid signature. */
export const ValidSignature = (): MethodDecorator & ClassDecorator => applyDecorators(UseGuards(SignedUrlGuard))
