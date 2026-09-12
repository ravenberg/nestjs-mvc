import { randomBytes } from 'node:crypto'
import { type AnyRequest, requestState } from './http'

/**
 * This request's CSP nonce, made on the first call and the same for the rest
 * of the request. Call it where you build the header — nestjs-mvc then puts
 * the same value on every script and style tag it renders:
 *
 * ```ts
 * app.use(helmet({
 *   contentSecurityPolicy: {
 *     directives: { scriptSrc: [(req) => `'nonce-${nonce(req)}'`] },
 *   },
 * }))
 * ```
 *
 * Without a nonce on the request (and without `csp: { nonce: true }`), the
 * tags stay as they are: an app that sets no policy gets no attributes it has
 * no use for.
 */
export function nonce(req: AnyRequest): string {
  const state = requestState(req)
  return (state.nonce ??= randomBytes(16).toString('base64'))
}

/** The nonce this request already has, if any; unlike `nonce()` it makes none. */
export function currentNonce(req: AnyRequest): string | undefined {
  return requestState(req).nonce
}
