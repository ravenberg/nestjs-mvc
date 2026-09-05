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
  /** Express and Fastify expose the scheme; raw requests do not. */
  protocol?: string
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
  /** Fastify's header setter. */
  header?: (name: string, value: string | string[]) => unknown
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

export const requestMethod = (req: AnyRequest): string => (req.method ?? rawRequest(req).method ?? 'GET').toUpperCase()

/** Path plus query string, as the client requested it. */
export const requestUrl = (req: AnyRequest): string => req.originalUrl ?? req.url ?? rawRequest(req).url ?? '/'

export const requestPath = (req: AnyRequest): string => requestUrl(req).split('?')[0]

/** The full URL for `X-Inertia-Location`, trusting a reverse proxy's forwarded headers. */
export function absoluteUrl(req: AnyRequest): string {
  const forwardedProto = header(req, 'x-forwarded-proto')?.split(',')[0].trim()
  const encrypted = (req.socket ?? rawRequest(req).socket) as { encrypted?: boolean } | undefined
  const protocol = forwardedProto ?? req.protocol ?? (encrypted?.encrypted ? 'https' : 'http')
  const host = header(req, 'x-forwarded-host') ?? header(req, 'host') ?? 'localhost'
  return `${protocol}://${host}${requestUrl(req)}`
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

export function setHeader(res: AnyResponse, name: string, value: string | string[]): void {
  if (typeof res.setHeader === 'function') res.setHeader(name, value)
  else if (typeof res.header === 'function') res.header(name, value)
  else res.raw?.setHeader(name, value)
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
