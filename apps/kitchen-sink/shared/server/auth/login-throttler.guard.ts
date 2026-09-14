import { type ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler'
import { ValidationException } from 'nestjs-mvc'

/**
 * `@nestjs/throttler` on the login form, the way Laravel's starter kits do it:
 * attempts are counted per email address *and* IP (one attacker cannot lock
 * someone else out from everywhere, nor try one account from many addresses
 * unnoticed), and the refusal is a validation error on `email`, so the form
 * shows it where the user is looking instead of an error page.
 *
 * The throttler keeps its counters in memory by default: per process and per
 * instance. Behind a load balancer, give `ThrottlerModule` a shared storage
 * (Redis) or every instance counts on its own.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  // `@nestjs/throttler` 6.5 predates NestJS 12 (its peer range stops at 11) and
  // is CommonJS: the `Reflector` it names in its metadata is not the one this
  // ESM app provides, so Nest cannot resolve it. Asking for it explicitly works.
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(options, storage, reflector)
  }

  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const email = String((req.body as { email?: unknown } | undefined)?.email ?? '').trim().toLowerCase()
    return `${email}|${String(req.ip)}`
  }

  protected override async throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ValidationException({
      email: `Too many login attempts. Try again in ${Math.max(1, detail.timeToBlockExpire)} seconds.`,
    })
  }
}
