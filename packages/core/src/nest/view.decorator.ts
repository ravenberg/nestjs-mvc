import { SetMetadata } from '@nestjs/common'
import { MVC_VIEW_METADATA } from './tokens'

/**
 * Marks a route handler as rendering a view — the MVC "V", except the view is a
 * page component in your frontend framework rather than a server-side template.
 * The handler's return value becomes the page props; the interceptor turns it
 * into either a JSON page object (Inertia visit) or the HTML shell (initial load).
 *
 * @example
 * ```ts
 * @Get()
 * @View('Dashboard')
 * dashboard() {
 *   return { user: this.users.current() }
 * }
 * ```
 */
export const View = (component: string): MethodDecorator => SetMetadata(MVC_VIEW_METADATA, component)
