import { fileURLToPath } from 'node:url'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { MvcModule } from 'nestjs-mvc'
import { DocsController } from './docs/docs.controller'
import { DocsService } from './docs/docs.service'
import { SharedPropsMiddleware } from './shared-props.middleware'
import { template } from './template'

const root = fileURLToPath(new URL('..', import.meta.url))

@Module({
  imports: [
    MvcModule.forRoot({
      version: 'dev',
      template,
      vite: { root },
      // A missing page is a page of ours, served with a real 404.
      errorPages: ({ status }) =>
        status === 404 ? { component: 'Errors/NotFound', props: {}, shared: true, ssr: true } : undefined,
    }),
  ],
  controllers: [DocsController],
  providers: [DocsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // `{*path}`: the wildcard is optional, so the root `/` is covered too.
    consumer.apply(SharedPropsMiddleware).forRoutes('{*path}')
  }
}
