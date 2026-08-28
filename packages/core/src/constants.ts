/** Request/response header names (lowercase for reading from Express `req.headers`). */
export const HEADER_INERTIA = 'x-inertia'
export const HEADER_VERSION = 'x-inertia-version'
export const HEADER_LOCATION = 'x-inertia-location'
export const HEADER_PARTIAL_DATA = 'x-inertia-partial-data'
export const HEADER_PARTIAL_EXCEPT = 'x-inertia-partial-except'
export const HEADER_PARTIAL_COMPONENT = 'x-inertia-partial-component'
export const HEADER_ERROR_BAG = 'x-inertia-error-bag'
export const HEADER_RESET = 'x-inertia-reset'

/** Cookie used to flash validation errors across the redirect-back. */
export const ERRORS_COOKIE = 'inertia_errors'

/** Metadata key set by the `@Inertia()` decorator. */
export const INERTIA_COMPONENT_METADATA = 'inertia:component'

/** DI token for the module options. */
export const INERTIA_MODULE_OPTIONS = 'INERTIA_MODULE_OPTIONS'

/** Key under which per-request Inertia state (shared props) is stored on the request object. */
export const INERTIA_REQUEST_STATE = Symbol.for('nestjs-inertia:state')
