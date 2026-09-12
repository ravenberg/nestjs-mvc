import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MvcRequestState } from '../protocol/types'
import { MVC_REQUEST_STATE } from './tokens'

/**
 * The one place that knows what a request or response object looks like.
 *
 * NestJS hands middleware the raw Node objects on every platform, and hands
 * handlers, interceptors and filters the platform's own objects (Express
 * `req`/`res`, Fastify `request`/`reply`). Everything the adapter needs — headers,
 * status, cookies, the URL — is reachable through the raw Node API plus a few
 * duck-typed fallbacks, so nothing outside this file imports a platform type.
 */

/** Any request: raw `IncomingMessage`, Express `req`, or a Fastify request wrapping `raw`. */
export interface AnyRequest {
  headers: IncomingMessage['headers']
  method?: string
  url?: string
  /** Express: the URL before any mount-path stripping. */
  originalUrl?: string
  /** Express and Fastify expose the scheme, honouring their own trust-proxy setting; raw requests do not. */
  protocol?: string
  /** Express 5 and Fastify 5 expose the host (with port), honouring their own trust-proxy setting. */
  host?: string
  /** Fastify wraps the Node request. */
  raw?: IncomingMessage
  socket?: IncomingMessage['socket']
  /** `express-session` / `@fastify/session`, when installed. */
  session?: Record<string, unknown>
}

/** Any response: raw `ServerResponse`, Express `res`, or a Fastify reply wrapping `raw`. */
export interface AnyResponse {
  raw?: ServerResponse
  statusCode?: number
  setHeader?: (name: string, value: string | string[]) => unknown
  getHeader?: (name: string) => unknown
  /** Fastify's header setter; for `set-cookie` it appends rather than replaces. */
  header?: (name: string, value: string | string[]) => unknown
  removeHeader?: (name: string) => unknown
  end?: (body?: string) => unknown
}

/** The Node request underneath, where per-request state lives on every platform. */
export const rawRequest = (req: AnyRequest): IncomingMessage => (req.raw ?? req) as IncomingMessage

/** A header as a single string; multi-value headers are joined the way HTTP joins them. */
export function header(req: AnyRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value.join(', ') : value
}

export const isInertia = (req: AnyRequest): boolean => header(req, 'x-inertia') === 'true'

/** A validate-only request from Inertia's `useForm` (Laravel Precognition protocol). */
export const isPrecognitive = (req: AnyRequest): boolean => header(req, 'precognition') === 'true'

/** A prefetch by the client (`Purpose: prefetch`): rendered, but not a navigation the user made. */
export const isPrefetch = (req: AnyRequest): boolean => header(req, 'purpose') === 'prefetch'

export const requestMethod = (req: AnyRequest): string => (req.method ?? rawRequest(req).method ?? 'GET').toUpperCase()

/** Path plus query string, as the client requested it. */
export const requestUrl = (req: AnyRequest): string => req.originalUrl ?? req.url ?? rawRequest(req).url ?? '/'

export const requestPath = (req: AnyRequest): string => requestUrl(req).split('?')[0]

/**
 * This app's origin as the browser sees it (`https://app.example.com`), or
 * `undefined` when the request does not say. `appUrl` (the module's `url`)
 * wins. Otherwise the platform's `protocol` and `host`, which honour Express's
 * `trust proxy` and Fastify's `trustProxy`: whether `X-Forwarded-*` may be
 * believed is the platform's decision, so this never reads those headers
 * itself. A raw request (middleware on Fastify) has only its socket and `Host`.
 */
export function requestOrigin(req: AnyRequest, appUrl?: string): string | undefined {
  if (appUrl) return new URL(appUrl).origin
  const socket = (req.socket ?? rawRequest(req).socket) as { encrypted?: boolean } | undefined
  const protocol = req.protocol ?? (socket?.encrypted ? 'https' : 'http')
  const host = req.host || header(req, 'host')
  if (!host) return undefined
  try {
    return new URL(`${protocol}://${host}`).origin
  } catch {
    return undefined
  }
}

/** The full URL of this request, on `requestOrigin()`. */
export function absoluteUrl(req: AnyRequest, appUrl?: string): string {
  return `${requestOrigin(req, appUrl) ?? 'http://localhost'}${requestUrl(req)}`
}

/**
 * Whether redirecting to `url` keeps the visitor on this app: a path (`/x`,
 * not `//x`), or an absolute http(s) URL on this app's origin. Everything
 * else is refused — scheme-relative URLs, `https:evil.com`, `javascript:`,
 * bare words, and anything with a backslash, whitespace or control character,
 * which browsers are known to "repair" into another host.
 */
export function isSafeRedirect(url: string | undefined, req: AnyRequest, appUrl?: string): url is string {
  if (!url || [...url].some(isUnsafeUrlChar)) return false
  if (url.startsWith('/')) return !url.startsWith('//')
  if (!/^https?:\/\//i.test(url)) return false
  try {
    return new URL(url).origin === requestOrigin(req, appUrl)
  } catch {
    return false
  }
}

/** Whitespace, control characters and `\`: the characters browsers strip or turn into `/`. */
const isUnsafeUrlChar = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return code <= 0x20 || code === 0x7f || char === '\\'
}

/** Where `back()` goes: the `Referer`, when it is on this app; else `fallback`. */
export function previousUrl(req: AnyRequest, fallback = '/', appUrl?: string): string {
  const referer = header(req, 'referer')
  return isSafeRedirect(referer, req, appUrl) ? referer : fallback
}

/** Per-request state, created by the middleware and found again by handlers on any platform. */
export function requestState(req: AnyRequest): MvcRequestState {
  const raw = rawRequest(req) as IncomingMessage & { [MVC_REQUEST_STATE]?: MvcRequestState }
  return (raw[MVC_REQUEST_STATE] ??= { shared: {}, pending: {} })
}

// ── Cookies: a header in, a header out; no platform plugin needed ─────────────

export function readCookie(req: AnyRequest, name: string): string | undefined {
  const raw = header(req, 'cookie')
  if (!raw) return undefined
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq !== -1 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

export interface CookieOptions {
  /** Seconds; omit for a session cookie. `0` expires it. */
  maxAge?: number
  path?: string
  httpOnly?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  secure?: boolean
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`]
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
    if (options.maxAge <= 0) parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
  }
  if (options.httpOnly ?? true) parts.push('HttpOnly')
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`)
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

export function getHeader(res: AnyResponse, name: string): unknown {
  return res.getHeader?.(name) ?? res.raw?.getHeader(name)
}

/** Replaces a header, on every platform. */
export function setHeader(res: AnyResponse, name: string, value: string | string[]): void {
  if (typeof res.setHeader === 'function') res.setHeader(name, value)
  else if (typeof res.header === 'function') {
    // Fastify's `header('set-cookie', …)` appends to what is there, so a second
    // cookie written on the same reply would repeat the first. Replace instead.
    res.removeHeader?.(name)
    res.header(name, value)
  } else res.raw?.setHeader(name, value)
}

/** Adds a value to the `Vary` header without dropping what is already there. */
export function appendVary(res: AnyResponse, value: string): void {
  const existing = getHeader(res, 'Vary')
  const values = (Array.isArray(existing) ? existing : existing ? [String(existing)] : [])
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (!values.some((entry) => entry.toLowerCase() === value.toLowerCase())) values.push(value)
  setHeader(res, 'Vary', values.join(', '))
}

/** Adds or replaces our `Set-Cookie` entry for `name`, leaving other cookies alone. */
export function writeCookie(res: AnyResponse, name: string, value: string, options?: CookieOptions): void {
  const existing = getHeader(res, 'Set-Cookie')
  const others = (Array.isArray(existing) ? existing : existing ? [String(existing)] : []).filter(
    (cookie) => !cookie.startsWith(`${name}=`),
  )
  setHeader(res, 'Set-Cookie', [...others, serializeCookie(name, value, options)])
}

export function clearCookie(res: AnyResponse, name: string, options?: CookieOptions): void {
  writeCookie(res, name, '', { ...options, maxAge: 0 })
}

/** Ends a raw response from middleware, before any platform routing has happened. */
export function endRaw(res: AnyResponse, status: number, headers: Record<string, string> = {}): void {
  const raw = (res.raw ?? res) as ServerResponse
  raw.statusCode = status
  for (const [name, value] of Object.entries(headers)) raw.setHeader(name, value)
  raw.end()
}
