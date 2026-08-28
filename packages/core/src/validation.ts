import { BadRequestException, type ValidationError } from '@nestjs/common'

/**
 * Flattens a `ValidationError` tree (as produced by `ValidationPipe`) into
 * `{ 'field': 'first message', 'parent.child': '...' }` — the shape Inertia
 * form helpers expect for the `errors` prop.
 */
export function flattenValidationErrors(errors: ValidationError[], parent = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property
    const first = Object.values(error.constraints ?? {})[0]
    if (first !== undefined) out[path] = first
    if (error.children?.length) Object.assign(out, flattenValidationErrors(error.children, path))
  }
  return out
}

/**
 * A `BadRequestException` carrying validation errors keyed by field, so the
 * `InertiaExceptionFilter` doesn't have to reverse-engineer them from the
 * default message array. Non-Inertia requests still get a regular 400 response
 * that includes the structured `errors` object.
 */
export class InertiaValidationException extends BadRequestException {
  constructor(readonly errors: Record<string, string>) {
    super({ statusCode: 400, error: 'Bad Request', message: 'Validation failed', errors })
  }
}

/**
 * Drop-in `exceptionFactory` for `ValidationPipe`:
 *
 * ```ts
 * app.useGlobalPipes(new ValidationPipe({ exceptionFactory: inertiaExceptionFactory }))
 * ```
 */
export const inertiaExceptionFactory = (errors: ValidationError[] = []): InertiaValidationException =>
  new InertiaValidationException(flattenValidationErrors(errors))
