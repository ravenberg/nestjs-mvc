import { SetMetadata } from '@nestjs/common'
import { MVC_SSR_METADATA } from './tokens'

/**
 * Opts a route into server-side rendering. SSR is off until a route asks for it,
 * so this decorator is the whole story for "my landing page should be indexable":
 *
 * ```ts
 * @Get()
 * @View('Home')
 * @Ssr()
 * home() { ... }
 * ```
 *
 * On a controller it applies to every handler in it, and a handler can opt back
 * out with `@Ssr(false)`:
 *
 * ```ts
 * @Controller('blog')
 * @Ssr()
 * export class BlogController {
 *   @Get('drafts') @View('Blog/Drafts') @Ssr(false)
 *   drafts() { ... }
 * }
 * ```
 *
 * A guard or service can still override the decorator for one request through
 * `ViewService.disableSsr()` / `enableSsr()`.
 */
export const Ssr = (enabled = true): MethodDecorator & ClassDecorator => SetMetadata(MVC_SSR_METADATA, enabled)
