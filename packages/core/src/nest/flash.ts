import { type AnyRequest, type AnyResponse, clearCookie, rawRequest, readCookie, writeCookie } from './http'

/**
 * What one request leaves for the next request of the same client: flash
 * messages, validation errors, and once-prop keys to refresh. It survives
 * exactly one render.
 */
export interface FlashBag {
  flash?: Record<string, unknown>
  errors?: Record<string, unknown>
  refresh?: string[]
  /** Tell the client to drop its (encrypted) history on the next render — after logout. */
  clearHistory?: boolean
  /** Tell the client to keep the URL fragment it visited with, across the redirect. */
  preserveFragment?: boolean
}

/**
 * Where the bag lives between two requests. The adapter never keeps it in
 * memory: the default store hands it to the client in a cookie, the session
 * store hands it to whatever session middleware the app already runs. Bound
 * through the `MVC_FLASH_STORE` provider, so an app can bring its own.
 */
export interface FlashStore {
  /** The bag the previous request left, if any. Must not consume it. */
  read(req: AnyRequest): FlashBag | undefined | Promise<FlashBag | undefined>
  /** Replaces the bag for this client's next request. */
  write(req: AnyRequest, res: AnyResponse, bag: FlashBag): void | Promise<void>
  /** Forgets the bag; called once it has been rendered. */
  clear(req: AnyRequest, res: AnyResponse): void | Promise<void>
}

export const mergeBags = (...bags: (FlashBag | undefined)[]): FlashBag => {
  const out: FlashBag = {}
  for (const bag of bags) {
    if (!bag) continue
    if (bag.flash && Object.keys(bag.flash).length > 0) out.flash = { ...out.flash, ...bag.flash }
    if (bag.errors) out.errors = bag.errors
    if (bag.refresh?.length) out.refresh = [...new Set([...(out.refresh ?? []), ...bag.refresh])]
    if (bag.clearHistory) out.clearHistory = true
    if (bag.preserveFragment) out.preserveFragment = true
  }
  return out
}

export const isEmptyBag = (bag: FlashBag): boolean =>
  !(bag.flash && Object.keys(bag.flash).length > 0) &&
  !bag.errors &&
  !bag.refresh?.length &&
  !bag.clearHistory &&
  !bag.preserveFragment

export interface CookieFlashStoreOptions {
  /** Cookie name. Defaults to `mvc_flash`. */
  name?: string
  /** Seconds the bag may wait for its next request before the browser drops it. Defaults to 300. */
  maxAge?: number
  /** Send only over HTTPS. Defaults to `false`; turn it on in production behind TLS. */
  secure?: boolean
}

/**
 * The default: the client carries its own bag in an `HttpOnly`, `SameSite=Lax`
 * cookie. Nothing is kept on the server, so one process serving many users
 * cannot mix them up, and a redirect chain or a 409 in between simply leaves the
 * cookie untouched — Laravel's "reflash" without a session.
 */
export class CookieFlashStore implements FlashStore {
  private readonly name: string
  private readonly maxAge: number
  private readonly secure: boolean

  constructor(options: CookieFlashStoreOptions = {}) {
    this.name = options.name ?? 'mvc_flash'
    this.maxAge = options.maxAge ?? 300
    this.secure = options.secure ?? false
  }

  read(req: AnyRequest): FlashBag | undefined {
    const raw = readCookie(req, this.name)
    if (raw === undefined) return undefined
    try {
      const parsed: unknown = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? (parsed as FlashBag) : undefined
    } catch {
      return undefined
    }
  }

  write(req: AnyRequest, res: AnyResponse, bag: FlashBag): void {
    if (isEmptyBag(bag)) return this.clear(req, res)
    writeCookie(res, this.name, JSON.stringify(bag), { maxAge: this.maxAge, secure: this.secure })
  }

  clear(_req: AnyRequest, res: AnyResponse): void {
    clearCookie(res, this.name, { secure: this.secure })
  }
}

/**
 * For apps that already run `express-session` or `@fastify/session`: the bag
 * lives under one key of the session, so it is never sent to the browser and
 * has no size limit. Bind it with `MvcModule.forRoot({ flash: { store: SessionFlashStore } })`.
 */
export class SessionFlashStore implements FlashStore {
  private readonly key: string

  constructor(options: { key?: string } = {}) {
    this.key = options.key ?? 'mvcFlash'
  }

  private session(req: AnyRequest): Record<string, unknown> {
    const session = req.session ?? (rawRequest(req) as AnyRequest).session
    if (!session) {
      throw new Error(
        '[nestjs-mvc] SessionFlashStore needs a session on the request — install express-session or ' +
          '@fastify/session, or use the default CookieFlashStore.',
      )
    }
    return session
  }

  read(req: AnyRequest): FlashBag | undefined {
    return this.session(req)[this.key] as FlashBag | undefined
  }

  write(req: AnyRequest, _res: AnyResponse, bag: FlashBag): void {
    this.session(req)[this.key] = bag
  }

  clear(req: AnyRequest): void {
    delete this.session(req)[this.key]
  }
}
