import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import type { Request, Response } from 'express'
import { ERRORS_COOKIE, HEADER_ERROR_BAG, HEADER_INERTIA } from '../protocol/constants'
import { ValidationException } from './validation'

/**
 * Turns validation failures on Inertia visits into the redirect-back flow the
 * protocol expects: the errors are flashed to a cookie and the client is
 * redirected to the previous page, where the interceptor consumes the cookie
 * and shares the errors as the `errors` prop. Honors `X-Inertia-Error-Bag`.
 *
 * Anything it can't extract field errors from — and every non-Inertia
 * request — falls through to Nest's default exception handling.
 */
@Catch(BadRequestException)
export class MvcExceptionFilter extends BaseExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return super.catch(exception, host)

    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    if (req.headers[HEADER_INERTIA] !== 'true') return super.catch(exception, host)

    const errors = extractErrors(exception)
    if (!errors) return super.catch(exception, host)

    const bag = req.headers[HEADER_ERROR_BAG]
    const payload = typeof bag === 'string' && bag.length > 0 ? { [bag]: errors } : errors

    // res.cookie URI-encodes the value itself; the interceptor decodes it back.
    res.cookie(ERRORS_COOKIE, JSON.stringify(payload), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })

    const back = req.headers.referer ?? '/'
    res.redirect(['PUT', 'PATCH', 'DELETE'].includes(req.method) ? 303 : 302, back)
  }
}

function extractErrors(exception: BadRequestException): Record<string, string> | null {
  if (exception instanceof ValidationException) return exception.errors

  const response = exception.getResponse()
  if (typeof response !== 'object' || response === null) return null
  const { message, errors } = response as { message?: unknown; errors?: unknown }

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(errors)) {
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first === 'string') out[key] = first
    }
    return Object.keys(out).length > 0 ? out : null
  }

  // Default ValidationPipe shape: message is an array like "email must be an
  // email" — class-validator always prefixes the property name, so the first
  // word is the field. First message per field wins, matching Laravel.
  if (Array.isArray(message)) {
    const out: Record<string, string> = {}
    for (const msg of message) {
      if (typeof msg !== 'string' || msg.length === 0) continue
      const field = msg.split(' ', 1)[0]
      out[field] ??= msg
    }
    return Object.keys(out).length > 0 ? out : null
  }

  return null
}
