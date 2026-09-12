/**
 * Wire-level constants of the Inertia protocol. These intentionally keep the
 * `Inertia`/`X-Inertia` naming: they are the protocol's vocabulary, not ours.
 */

/** Request/response header names (lowercase for reading from Express `req.headers`). */
export const HEADER_INERTIA = 'x-inertia'
export const HEADER_VERSION = 'x-inertia-version'
export const HEADER_LOCATION = 'x-inertia-location'
export const HEADER_PARTIAL_DATA = 'x-inertia-partial-data'
export const HEADER_PARTIAL_EXCEPT = 'x-inertia-partial-except'
export const HEADER_PARTIAL_COMPONENT = 'x-inertia-partial-component'
export const HEADER_ERROR_BAG = 'x-inertia-error-bag'
export const HEADER_RESET = 'x-inertia-reset'
export const HEADER_MERGE_INTENT = 'x-inertia-infinite-scroll-merge-intent'
export const HEADER_EXCEPT_ONCE_PROPS = 'x-inertia-except-once-props'

/**
 * The CSRF double-submit pair the client's HTTP client speaks by default: it
 * reads the cookie and echoes it in the header on every request it makes.
 */
export const XSRF_COOKIE = 'XSRF-TOKEN'
export const HEADER_XSRF_TOKEN = 'x-xsrf-token'

/**
 * What `nestjsMvc()` puts in Vite's `html.cspNonce` during development: Vite
 * then writes it on every script and style tag it hands back (its own client,
 * a plugin's preamble, ours), and the adapter swaps it for this request's
 * nonce — or takes the attributes out again when the app uses no nonce.
 */
export const NONCE_PLACEHOLDER = 'nestjs-mvc-nonce'

/** Default cookie of the `CookieFlashStore`: flash data, validation errors and refresh keys, for one render. */
export const FLASH_COOKIE = 'mvc_flash'
