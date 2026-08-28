import { DynamicModule, Inject, MiddlewareConsumer, Module, NestModule, Provider } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { INERTIA_MODULE_OPTIONS } from './constants'
import { InertiaExceptionFilter } from './inertia-exception.filter'
import { InertiaInterceptor } from './inertia.interceptor'
import { InertiaMiddleware } from './inertia.middleware'
import { InertiaService } from './inertia.service'
import type { InertiaModuleOptions } from './types'

export interface InertiaModuleAsyncOptions {
  imports?: DynamicModule['imports']
  inject?: unknown[]
  useFactory: (...args: never[]) => InertiaModuleOptions | Promise<InertiaModuleOptions>
}

@Module({})
export class InertiaModule implements NestModule {
  constructor(@Inject(INERTIA_MODULE_OPTIONS) private readonly options: InertiaModuleOptions) {}

  static forRoot(options: InertiaModuleOptions = {}): DynamicModule {
    return this.build({ provide: INERTIA_MODULE_OPTIONS, useValue: options })
  }

  static forRootAsync(options: InertiaModuleAsyncOptions): DynamicModule {
    return this.build(
      {
        provide: INERTIA_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: (options.inject ?? []) as never[],
      },
      options.imports,
    )
  }

  private static build(optionsProvider: Provider, imports?: DynamicModule['imports']): DynamicModule {
    return {
      module: InertiaModule,
      global: true,
      imports,
      providers: [
        optionsProvider,
        InertiaService,
        InertiaMiddleware,
        { provide: APP_INTERCEPTOR, useClass: InertiaInterceptor },
        { provide: APP_FILTER, useClass: InertiaExceptionFilter },
      ],
      exports: [INERTIA_MODULE_OPTIONS, InertiaService],
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(InertiaMiddleware).forRoutes('{*splat}')
  }
}
