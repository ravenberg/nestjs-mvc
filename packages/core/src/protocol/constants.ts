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

/** Default cookie of the `CookieFlashStore`: flash data, validation errors and refresh keys, for one render. */
export const FLASH_COOKIE = 'mvc_flash'
