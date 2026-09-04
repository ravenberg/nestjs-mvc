import {
  DynamicModule,
  Inject,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Provider,
} from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, HttpAdapterHost } from '@nestjs/core'
import { INERTIA_ASSETS, INERTIA_MODULE_OPTIONS, INERTIA_VITE_SERVER } from './constants'
import { InertiaExceptionFilter } from './inertia-exception.filter'
import { InertiaInterceptor } from './inertia.interceptor'
import { InertiaMiddleware } from './inertia.middleware'
import { InertiaService } from './inertia.service'
import type { InertiaModuleOptions } from './types'
import { InertiaAssets, ViteDevServerHolder, createViteDevServer, isViteDev } from './vite'
import { ViteDevMiddleware } from './vite.middleware'

export interface InertiaModuleAsyncOptions {
  imports?: DynamicModule['imports']
  inject?: unknown[]
  useFactory: (...args: never[]) => InertiaModuleOptions | Promise<InertiaModuleOptions>
}

@Module({})
export class InertiaModule implements NestModule, OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    @Inject(INERTIA_MODULE_OPTIONS) private readonly options: InertiaModuleOptions,
    @Inject(INERTIA_VITE_SERVER) private readonly holder: ViteDevServerHolder,
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
  ) {}

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
        { provide: INERTIA_VITE_SERVER, useValue: new ViteDevServerHolder() },
        {
          provide: INERTIA_ASSETS,
          useFactory: (options: InertiaModuleOptions, holder: ViteDevServerHolder) =>
            new InertiaAssets(options.vite, holder),
          inject: [INERTIA_MODULE_OPTIONS, INERTIA_VITE_SERVER],
        },
        InertiaService,
        InertiaMiddleware,
        ViteDevMiddleware,
        { provide: APP_INTERCEPTOR, useClass: InertiaInterceptor },
        { provide: APP_FILTER, useClass: InertiaExceptionFilter },
      ],
      exports: [INERTIA_MODULE_OPTIONS, INERTIA_ASSETS, INERTIA_VITE_SERVER, InertiaService],
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    // Checked against the options rather than the dev server, which only exists after bootstrap.
    if (this.viteEnabled) {
      // Vite first: it owns /@vite/*, /@react-refresh and source files, and defers the rest.
      consumer.apply(ViteDevMiddleware).forRoutes('{*splat}')
    }
    consumer.apply(InertiaMiddleware).forRoutes('{*splat}')
  }

  /**
   * Runs after Nest has created its http.Server but before it listens, which is the
   * first point where the HMR websocket can be attached to the application port.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.viteEnabled || this.holder.server) return
    const httpServer: unknown = this.adapterHost?.httpAdapter?.getHttpServer?.()
    this.holder.server = await createViteDevServer(this.options.vite!, httpServer)
  }

  async onModuleDestroy(): Promise<void> {
    await this.holder.server?.close()
    this.holder.server = null
  }

  private get viteEnabled(): boolean {
    return this.options.vite !== undefined && isViteDev(this.options.vite)
  }
}
