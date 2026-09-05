// ── Nest layer ────────────────────────────────────────────────────────────────
export { View } from './nest/view.decorator'
export { Ssr } from './nest/ssr.decorator'
export { MvcModule, type MvcModuleAsyncOptions } from './nest/mvc.module'
export type { MvcModuleOptions } from './nest/types'
export { ViewService } from './nest/view.service'
export { SsrService } from './nest/ssr.service'
export { MvcInterceptor } from './nest/mvc.interceptor'
export { MvcMiddleware } from './nest/mvc.middleware'
export { MvcExceptionFilter } from './nest/mvc-exception.filter'
export { ValidationException, validationExceptionFactory, flattenValidationErrors } from './nest/validation'
export {
  MVC_MODULE_OPTIONS,
  MVC_VIEW_METADATA,
  MVC_SSR_METADATA,
  MVC_REQUEST_STATE,
  MVC_VITE_SERVER,
  MVC_ASSETS,
} from './nest/tokens'

// ── SSR ───────────────────────────────────────────────────────────────────────
export { decideSsr, type SsrDecision, type SsrOptIn } from './ssr/decide'
export { HttpSsrRenderer, SsrHttpError } from './ssr/http-renderer'
export { ModuleSsrRenderer } from './ssr/module-renderer'
export { ViteSsrRenderer, type ViteSsrHost } from './ssr/vite-renderer'
export {
  DEFAULT_SSR_URL,
  DEFAULT_SSR_BUNDLE,
  DEFAULT_SSR_TIMEOUT,
  type SsrOptions,
  type SsrContext,
  type SsrResult,
  type SsrError,
  type SsrRenderer,
} from './ssr/types'

// ── Vite integration ──────────────────────────────────────────────────────────
export { ViteDevMiddleware } from './nest/vite.middleware'
export {
  ViteAssets,
  ViteDevServerHolder,
  createViteDevServer,
  isViteDev,
  pluginApi,
  type ViteOptions,
  type ViteDevServerLike,
} from './nest/vite'
export type { NestjsMvcPluginApi, NestjsMvcPluginOptions } from './vite/plugin'

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
