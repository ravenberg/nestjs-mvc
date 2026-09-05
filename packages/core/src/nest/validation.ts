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
 * `MvcExceptionFilter` doesn't have to reverse-engineer them from the
 * default message array. Non-Inertia requests still get a regular 400 response
 * that includes the structured `errors` object.
 */
export class ValidationException extends BadRequestException {
  constructor(readonly errors: Record<string, string>) {
    super({ statusCode: 400, error: 'Bad Request', message: 'Validation failed', errors })
  }
}

/**
 * Drop-in `exceptionFactory` for `ValidationPipe`:
 *
 * ```ts
 * app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
 * ```
 */
export const validationExceptionFactory = (errors: ValidationError[] = []): ValidationException =>
  new ValidationException(flattenValidationErrors(errors))

/**
 * The part of a Standard Schema issue the adapter reads (Zod, Valibot, ArkType
 * and friends all produce these). Declared here so `nestjs-mvc` needs no
 * dependency on `@standard-schema/spec`.
 */
export interface StandardSchemaIssue {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined
}

/** Errors that belong to the whole value rather than a field are keyed under this name. */
export const ROOT_ERROR_KEY = '_form'

/**
 * Flattens Standard Schema issues into `{ 'user.name': 'first message' }`. The
 * spec already emits nested paths as arrays, so this is a join, not a parse:
 * `['user', 'name']` → `user.name`, `['tags', 0]` → `tags.0`. First message per
 * path wins, matching `flattenValidationErrors` and Laravel.
 */
export function flattenIssues(issues: readonly StandardSchemaIssue[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const segments = (issue.path ?? []).map((segment) =>
      String(typeof segment === 'object' && segment !== null ? segment.key : segment),
    )
    const key = segments.length > 0 ? segments.join('.') : ROOT_ERROR_KEY
    out[key] ??= issue.message
  }
  return out
}

/**
 * Drop-in `exceptionFactory` for NestJS v12's `StandardSchemaValidationPipe`,
 * which validates `@Body({ schema })` and needs no `emitDecoratorMetadata`:
 *
 * ```ts
 * app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))
 * ```
 */
export const standardSchemaExceptionFactory = (issues: readonly StandardSchemaIssue[] = []): ValidationException =>
  new ValidationException(flattenIssues(issues))

/**
 * Field errors from any `BadRequestException` Nest's pipes produce, keyed by
 * dot path with the first message per field, or `null` when the exception
 * carries no field errors at all:
 *
 * - `ValidationException`: taken as they are
 * - an `errors` object in the response body (the factories above)
 * - `ValidationPipe({ errorFormat: 'grouped' })`: `message` keyed by path
 * - a message list: `"user.email: Invalid email"` (Standard Schema pipe) or
 *   `"email must be an email"` (class-validator, first word is the field)
 */
export function extractFieldErrors(exception: BadRequestException): Record<string, string> | null {
  if (exception instanceof ValidationException) return exception.errors

  const response = exception.getResponse()
  if (typeof response !== 'object' || response === null) return null
  const { message, errors } = response as { message?: unknown; errors?: unknown }

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) return firstPerKey(errors as Record<string, unknown>)
  if (message && typeof message === 'object' && !Array.isArray(message)) return firstPerKey(message as Record<string, unknown>)

  if (Array.isArray(message)) {
    const out: Record<string, string> = {}
    for (const msg of message) {
      if (typeof msg !== 'string' || msg.length === 0) continue
      const prefixed = /^([\w.[\]-]+): (.+)$/.exec(msg)
      const field = prefixed ? prefixed[1] : msg.split(' ', 1)[0]
      out[field] ??= prefixed ? prefixed[2] : msg
    }
    return Object.keys(out).length > 0 ? out : null
  }

  return null
}

function firstPerKey(grouped: Record<string, unknown>): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(grouped)) {
    const first = Array.isArray(value) ? value[0] : value
    if (typeof first === 'string') out[key] = first
  }
  return Object.keys(out).length > 0 ? out : null
}
