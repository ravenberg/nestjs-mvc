import { BadRequestException, type ValidationError } from '@nestjs/common'

/**
 * Validation errors keyed by dot path. A string per field by default; an
 * array per field when all messages are carried (`messages: 'all'`).
 */
export type FieldErrors = Record<string, string | string[]>

export interface ValidationOptions {
  /**
   * How many messages to carry per field. `'first'` (default) is Laravel's
   * behaviour and matches the client's default `ErrorValue` of `string`.
   * `'all'` sends every message as an array; declare
   * `errorValueType: string[]` in the client's `InertiaConfig` to match.
   */
  messages?: 'first' | 'all'
  /**
   * The status of the JSON answer to a validation failure on a request that
   * is not an Inertia visit. `400` (default) leaves Nest's response alone.
   * `422` answers `{ message, errors }` — what Laravel sends and what
   * Inertia's `useHttp()` and the Precognition client expect.
   */
  jsonStatus?: 400 | 422
}

/** Errors that belong to the whole value rather than a field are keyed under this name. */
export const ROOT_ERROR_KEY = '_form'

/** One message or all of them, per `options.messages`. */
function reduce(messages: string[], options: ValidationOptions | undefined): string | string[] | undefined {
  if (messages.length === 0) return undefined
  return options?.messages === 'all' ? messages : messages[0]
}

/**
 * Flattens a `ValidationError` tree (as produced by `ValidationPipe`) into
 * `{ 'field': 'first message', 'parent.child': '...' }` — the shape Inertia
 * form helpers expect for the `errors` prop — or every message per field as
 * an array with `{ messages: 'all' }`.
 */
export function flattenValidationErrors(errors: ValidationError[], options?: ValidationOptions): FieldErrors {
  const out: FieldErrors = {}
  const walk = (list: ValidationError[], parent: string) => {
    for (const error of list) {
      const path = parent ? `${parent}.${error.property}` : error.property
      const value = reduce(Object.values(error.constraints ?? {}), options)
      if (value !== undefined) out[path] = value
      if (error.children?.length) walk(error.children, path)
    }
  }
  walk(errors, '')
  return out
}

/**
 * A `BadRequestException` carrying validation errors keyed by field, so the
 * `MvcExceptionFilter` doesn't have to reverse-engineer them from the
 * default message array. Non-Inertia requests still get a regular 400 response
 * that includes the structured `errors` object (or a 422, see
 * `ValidationOptions.jsonStatus`).
 */
export class ValidationException extends BadRequestException {
  constructor(readonly errors: FieldErrors) {
    super({ statusCode: 400, error: 'Bad Request', message: 'Validation failed', errors })
  }
}

/**
 * Builds an `exceptionFactory` for `ValidationPipe`:
 *
 * ```ts
 * app.useGlobalPipes(new ValidationPipe({ exceptionFactory: createValidationExceptionFactory({ messages: 'all' }) }))
 * ```
 */
export const createValidationExceptionFactory =
  (options?: ValidationOptions) =>
  (errors: ValidationError[] = []): ValidationException =>
    new ValidationException(flattenValidationErrors(errors, options))

/**
 * Drop-in `exceptionFactory` for `ValidationPipe`, first message per field:
 *
 * ```ts
 * app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
 * ```
 */
export const validationExceptionFactory = createValidationExceptionFactory()

/**
 * The part of a Standard Schema issue the adapter reads (Zod, Valibot, ArkType
 * and friends all produce these). Declared here so `nestjs-mvc` needs no
 * dependency on `@standard-schema/spec`.
 */
export interface StandardSchemaIssue {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined
}

/**
 * Flattens Standard Schema issues into `{ 'user.name': 'first message' }`. The
 * spec already emits nested paths as arrays, so this is a join, not a parse:
 * `['user', 'name']` → `user.name`, `['tags', 0]` → `tags.0`. First message per
 * path wins, matching `flattenValidationErrors` and Laravel; `{ messages: 'all' }`
 * keeps every message as an array, in the schema's order.
 */
export function flattenIssues(issues: readonly StandardSchemaIssue[], options?: ValidationOptions): FieldErrors {
  const grouped: Record<string, string[]> = {}
  for (const issue of issues) {
    const segments = (issue.path ?? []).map((segment) =>
      String(typeof segment === 'object' && segment !== null ? segment.key : segment),
    )
    const key = segments.length > 0 ? segments.join('.') : ROOT_ERROR_KEY
    ;(grouped[key] ??= []).push(issue.message)
  }
  return reduceAll(grouped, options) ?? {}
}

/**
 * Builds an `exceptionFactory` for NestJS v12's `StandardSchemaValidationPipe`:
 *
 * ```ts
 * app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: createStandardSchemaExceptionFactory({ messages: 'all' }) }))
 * ```
 */
export const createStandardSchemaExceptionFactory =
  (options?: ValidationOptions) =>
  (issues: readonly StandardSchemaIssue[] = []): ValidationException =>
    new ValidationException(flattenIssues(issues, options))

/**
 * Drop-in `exceptionFactory` for NestJS v12's `StandardSchemaValidationPipe`,
 * which validates `@Body({ schema })` and needs no `emitDecoratorMetadata`:
 *
 * ```ts
 * app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))
 * ```
 */
export const standardSchemaExceptionFactory = createStandardSchemaExceptionFactory()

/**
 * Field errors from any `BadRequestException` Nest's pipes produce, keyed by
 * dot path, or `null` when the exception carries no field errors at all:
 *
 * - `ValidationException`: taken as they are
 * - an `errors` object in the response body (the factories above, or your
 *   own `throw new BadRequestException({ errors })`): taken as they are,
 *   strings and arrays alike
 * - `ValidationPipe({ errorFormat: 'grouped' })`: `message` keyed by path
 * - a message list: `"user.email: Invalid email"` (Standard Schema pipe) or
 *   `"email must be an email"` (class-validator, first word is the field)
 *
 * The last two are Nest's own formats, and `options.messages` decides whether
 * one or all messages per field are kept. What you produced yourself is not
 * reduced.
 */
export function extractFieldErrors(exception: BadRequestException, options?: ValidationOptions): FieldErrors | null {
  if (exception instanceof ValidationException) return exception.errors

  const response = exception.getResponse()
  if (typeof response !== 'object' || response === null) return null
  const { message, errors } = response as { message?: unknown; errors?: unknown }

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) return asFieldErrors(errors as Record<string, unknown>)
  if (message && typeof message === 'object' && !Array.isArray(message)) {
    return reduceAll(onlyStrings(message as Record<string, unknown>), options)
  }

  if (Array.isArray(message)) {
    const grouped: Record<string, string[]> = {}
    for (const msg of message) {
      if (typeof msg !== 'string' || msg.length === 0) continue
      const prefixed = /^([\w.[\]-]+): (.+)$/.exec(msg)
      const field = prefixed ? prefixed[1] : msg.split(' ', 1)[0]
      ;(grouped[field] ??= []).push(prefixed ? prefixed[2] : msg)
    }
    return reduceAll(grouped, options)
  }

  return null
}

/** Keeps string and string-array values as they are; anything else is not an error message. */
function asFieldErrors(given: Record<string, unknown>): FieldErrors | null {
  const out: FieldErrors = {}
  for (const [key, value] of Object.entries(given)) {
    if (typeof value === 'string') out[key] = value
    else if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : null
}

function onlyStrings(grouped: Record<string, unknown>): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(grouped)) {
    const list = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string')
    if (list.length > 0) out[key] = list
  }
  return out
}

function reduceAll(grouped: Record<string, string[]>, options: ValidationOptions | undefined): FieldErrors | null {
  const out: FieldErrors = {}
  for (const [key, messages] of Object.entries(grouped)) {
    const value = reduce(messages, options)
    if (value !== undefined) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : null
}
