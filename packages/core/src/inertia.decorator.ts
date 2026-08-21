import { SetMetadata } from '@nestjs/common'
import { INERTIA_COMPONENT_METADATA } from './constants'

/**
 * Marks a route handler as an Inertia page. The handler's return value becomes
 * the page props; the interceptor turns it into either a JSON page object
 * (Inertia visit) or the HTML shell (initial load).
 *
 * @example
 * ```ts
 * @Get()
 * @Inertia('Dashboard')
 * dashboard() {
 *   return { user: this.users.current() }
 * }
 * ```
 */
export const Inertia = (component: string): MethodDecorator => SetMetadata(INERTIA_COMPONENT_METADATA, component)
