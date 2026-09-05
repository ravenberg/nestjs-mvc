/** DI tokens and metadata keys for the Nest layer. */

/** Metadata key set by the `@View()` decorator. */
export const MVC_VIEW_METADATA = 'mvc:view'

/** Metadata key set by the `@Ssr()` decorator. */
export const MVC_SSR_METADATA = 'mvc:ssr'

/** Metadata key set by the `@EncryptHistory()` decorator. */
export const MVC_ENCRYPT_HISTORY_METADATA = 'mvc:encrypt-history'

/** DI token for the module options. */
export const MVC_MODULE_OPTIONS = 'MVC_MODULE_OPTIONS'

/** DI token for the in-process Vite dev server (null outside development). */
export const MVC_VITE_SERVER = 'MVC_VITE_SERVER'

/** DI token for the asset-tag resolver (Vite dev server or build manifest). */
export const MVC_ASSETS = 'MVC_ASSETS'

/** DI token for the flash store (cookie by default; bind your own to use a session). */
export const MVC_FLASH_STORE = 'MVC_FLASH_STORE'

/** Key under which per-request state (shared props) is stored on the request object. */
export const MVC_REQUEST_STATE = Symbol.for('nestjs-mvc:state')
