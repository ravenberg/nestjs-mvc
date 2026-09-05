import {
  ArgumentMetadata,
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  PipeTransform,
  Type,
} from '@nestjs/common'
import { ApplicationConfig, ModuleRef } from '@nestjs/core'
import { Observable, from, switchMap } from 'rxjs'
import { type AnyRequest, type AnyResponse, appendVary, header, isPrecognitive, setHeader } from './http'
import { extractFieldErrors } from './validation'

/**
 * Thrown by the `PrecognitionInterceptor` to end a precognitive request with
 * its verdict; the `MvcExceptionFilter` writes it through Nest's HTTP adapter.
 * `204` + `Precognition-Success` when the inputs pass, `422` + `errors` when not.
 */
export class MvcPrecognition extends Error {
  constructor(readonly errors: Record<string, string> | null) {
    super(errors ? 'Precognition: validation failed' : 'Precognition: success')
    this.name = 'MvcPrecognition'
  }
}

/** Nest's metadata keys; the strings are part of `@nestjs/common`'s public constants. */
const ROUTE_ARGS_METADATA = '__routeArguments__'
const PIPES_METADATA = '__pipes__'

/** `RouteParamtypes` values that go through pipes and carry user input. */
const PIPEABLE: Record<number, ArgumentMetadata['type']> = { 3: 'body', 4: 'query', 5: 'param' }

interface ParamMetadata {
  index: number
  data?: string
  pipes?: (PipeTransform | Type<PipeTransform>)[]
  schema?: unknown
}

/**
 * Live validation through the same pipes as the real submission.
 *
 * A request carrying `Precognition: true` must be validated but not handled.
 * Nest runs pipes as part of the handler invocation, so `next.handle()` would do
 * both. Instead this interceptor runs the same pipe chain Nest would — global
 * pipes, `@UsePipes()` on the controller and handler, and the parameter's own —
 * against the same inputs, then stops with a verdict. Same `ValidationPipe`,
 * same schema, same `exceptionFactory`, same error format as the real submit.
 *
 * `Precognition-Validate-Only: user.email,user.name` narrows the reported
 * errors to those fields. Every response of an intercepted route gets
 * `Vary: Precognition`, so caches never confuse the two kinds.
 */
@Injectable()
export class PrecognitionInterceptor implements NestInterceptor {
  constructor(
    @Inject(ApplicationConfig) private readonly config: ApplicationConfig,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()

    const http = context.switchToHttp()
    const req = http.getRequest<AnyRequest>()
    const res = http.getResponse<AnyResponse>()
    appendVary(res, 'Precognition')

    if (!isPrecognitive(req)) return next.handle()

    setHeader(res, 'Precognition', 'true')
    return from(this.predict(context, req)).pipe(
      switchMap((verdict) => {
        throw verdict
      }),
    )
  }

  /** Runs the handler's parameter pipes and returns the verdict as the exception to throw. */
  private async predict(context: ExecutionContext, req: AnyRequest): Promise<MvcPrecognition> {
    const controller = context.getClass()
    const handler = context.getHandler()
    const params = (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, handler.name) ?? {}) as Record<
      string,
      ParamMetadata
    >
    const paramtypes = (Reflect.getMetadata('design:paramtypes', controller.prototype, handler.name) ?? []) as unknown[]

    const shared = [
      ...this.config.getGlobalPipes(),
      ...this.resolve(Reflect.getMetadata(PIPES_METADATA, controller) ?? []),
      ...this.resolve(Reflect.getMetadata(PIPES_METADATA, handler) ?? []),
    ]

    const only = (header(req, 'precognition-validate-only') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const errors: Record<string, string> = {}

    for (const [key, meta] of Object.entries(params)) {
      const type = PIPEABLE[Number(key.split(':')[0])]
      if (!type) continue

      const metadata: ArgumentMetadata = {
        type,
        data: meta.data,
        metatype: paramtypes[meta.index] as Type<unknown> | undefined,
        schema: meta.schema,
      } as ArgumentMetadata
      const pipes = [...shared, ...this.resolve(meta.pipes ?? [])]
      let value = this.extract(req, type, meta.data)

      try {
        for (const pipe of pipes) value = await pipe.transform(value, metadata)
      } catch (cause) {
        const fields = cause instanceof BadRequestException ? extractFieldErrors(cause) : null
        // Anything without field errors is not a validation verdict: let it surface as usual.
        if (!fields) throw cause
        for (const [field, message] of Object.entries(fields)) errors[field] ??= message
      }
    }

    const reported = only.length > 0 ? pick(errors, only) : errors
    return new MvcPrecognition(Object.keys(reported).length > 0 ? reported : null)
  }

  /** The same values `@Body()`, `@Query()` and `@Param()` would receive. */
  private extract(req: AnyRequest, type: ArgumentMetadata['type'], data?: string): unknown {
    const source = (req as AnyRequest & Record<string, unknown>)[type === 'param' ? 'params' : type] as
      | Record<string, unknown>
      | undefined
    return data ? source?.[data] : source
  }

  /** Pipe instances are used as they are; classes are taken from the container, else constructed. */
  private resolve(pipes: (PipeTransform | Type<PipeTransform>)[]): PipeTransform[] {
    return pipes.map((pipe) => {
      if (typeof pipe !== 'function') return pipe
      try {
        return this.moduleRef.get(pipe, { strict: false })
      } catch {
        return new pipe()
      }
    })
  }
}

/** Keeps the errors for the requested fields, including their nested paths. */
function pick(errors: Record<string, string>, only: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, message] of Object.entries(errors)) {
    if (only.some((field) => key === field || key.startsWith(`${field}.`))) out[key] = message
  }
  return out
}
