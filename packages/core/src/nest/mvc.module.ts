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
import { MVC_ASSETS, MVC_MODULE_OPTIONS, MVC_VITE_SERVER } from './tokens'
import { MvcExceptionFilter } from './mvc-exception.filter'
import { MvcInterceptor } from './mvc.interceptor'
import { MvcMiddleware } from './mvc.middleware'
import { SsrService } from './ssr.service'
import { ViewService } from './view.service'
import type { MvcModuleOptions } from './types'
import { ViteAssets, ViteDevServerHolder, createViteDevServer, isViteDev } from './vite'
import { ViteDevMiddleware } from './vite.middleware'

export interface MvcModuleAsyncOptions {
  imports?: DynamicModule['imports']
  inject?: unknown[]
  useFactory: (...args: never[]) => MvcModuleOptions | Promise<MvcModuleOptions>
}

@Module({})
export class MvcModule implements NestModule, OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(MVC_VITE_SERVER) private readonly holder: ViteDevServerHolder,
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
  ) {}

  static forRoot(options: MvcModuleOptions = {}): DynamicModule {
    return this.build({ provide: MVC_MODULE_OPTIONS, useValue: options })
  }

  static forRootAsync(options: MvcModuleAsyncOptions): DynamicModule {
    return this.build(
      {
        provide: MVC_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: (options.inject ?? []) as never[],
      },
      options.imports,
    )
  }

  private static build(optionsProvider: Provider, imports?: DynamicModule['imports']): DynamicModule {
    return {
      module: MvcModule,
      global: true,
      imports,
      providers: [
        optionsProvider,
        { provide: MVC_VITE_SERVER, useValue: new ViteDevServerHolder() },
        {
          provide: MVC_ASSETS,
          useFactory: (options: MvcModuleOptions, holder: ViteDevServerHolder) =>
            new ViteAssets(options.vite, holder),
          inject: [MVC_MODULE_OPTIONS, MVC_VITE_SERVER],
        },
        ViewService,
        SsrService,
        MvcMiddleware,
        ViteDevMiddleware,
        { provide: APP_INTERCEPTOR, useClass: MvcInterceptor },
        { provide: APP_FILTER, useClass: MvcExceptionFilter },
      ],
      exports: [MVC_MODULE_OPTIONS, MVC_ASSETS, MVC_VITE_SERVER, ViewService, SsrService],
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    // Checked against the options rather than the dev server, which only exists after bootstrap.
    if (this.viteEnabled) {
      // Vite first: it owns /@vite/*, /@react-refresh and source files, and defers the rest.
      consumer.apply(ViteDevMiddleware).forRoutes('{*splat}')
    }
    consumer.apply(MvcMiddleware).forRoutes('{*splat}')
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
