// ── Nest layer ────────────────────────────────────────────────────────────────
export { View } from './nest/view.decorator'
export { MvcModule, type MvcModuleAsyncOptions } from './nest/mvc.module'
export type { MvcModuleOptions } from './nest/types'
export { ViewService } from './nest/view.service'
export { MvcInterceptor } from './nest/mvc.interceptor'
export { MvcMiddleware } from './nest/mvc.middleware'
export { MvcExceptionFilter } from './nest/mvc-exception.filter'
export { ValidationException, validationExceptionFactory, flattenValidationErrors } from './nest/validation'
export {
  MVC_MODULE_OPTIONS,
  MVC_VIEW_METADATA,
  MVC_REQUEST_STATE,
  MVC_VITE_SERVER,
  MVC_ASSETS,
} from './nest/tokens'

// ── Vite integration ──────────────────────────────────────────────────────────
export { ViteDevMiddleware } from './nest/vite.middleware'
export {
  ViteAssets,
  ViteDevServerHolder,
  createViteDevServer,
  isViteDev,
  type ViteOptions,
  type ViteDevServerLike,
} from './nest/vite'

// ── Protocol layer (framework-agnostic) ───────────────────────────────────────
export {
  optional,
  defer,
  always,
  merge,
  resolveProps,
  Prop,
  OptionalProp,
  DeferProp,
  AlwaysProp,
  MergeProp,
  type PropValue,
  type PartialReload,
  type ResolvedProps,
} from './protocol/props'
export { viewBody, defaultTemplate } from './protocol/html'
export { resolveVersion } from './protocol/version'
export type {
  PageObject,
  AssetVersion,
  MvcRequestState,
  TemplateFn,
  TemplateContext,
} from './protocol/types'
export { ERRORS_COOKIE } from './protocol/constants'
