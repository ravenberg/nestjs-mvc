import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MvcModule } from 'nestjs-mvc'
import { AppController } from './app.controller'
import { ContactsController } from './crm/contacts.controller'
import { DashboardController } from './crm/dashboard.controller'
import { OrganizationsController } from './crm/organizations.controller'
import { DatabaseModule } from './database/database.module'
import { InfiniteScrollController } from './features/infinite-scroll.controller'
import { OncePropsController } from './features/once-props.controller'
import { DottedKeysController } from './features/dotted-keys.controller'
import { ErrorsController } from './features/errors.controller'
import { PropMergingController } from './features/prop-merging.controller'
import { DeferredPropsController } from './features/deferred-props.controller'
import { HistoryController } from './features/history.controller'
import { FragmentsController } from './features/fragments.controller'
import { SharedPropsController } from './features/shared-props.controller'
import { FormsController } from './features/forms.controller'
import { NavigationController } from './features/navigation.controller'
import { DataLoadingController } from './features/data-loading.controller'
import { PrefetchingController } from './features/prefetching.controller'
import { StateController } from './features/state.controller'
import { Note } from './database/entities/note.entity'
import { User } from './database/entities/user.entity'
import { SharedPropsMiddleware } from './shared-props.middleware'
import { template } from './template'

const root = new URL('..', import.meta.url).pathname

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User, Note]),
    MvcModule.forRoot({
      version: 'dev',
      template,
      // Runs Vite in-process during dev; resolves hashed manifest assets in
      // production. Entries come from nestjsMvc() in vite.config.ts, and routes
      // opt into SSR with @Ssr() — rendered in this same process either way.
      vite: { root },
      // Our own page for the errors we choose, with the error's status code; the
      // rest stays NestJS's default JSON. A real app would usually return nothing
      // in development to keep the stack trace — the demo renders always so the
      // page is visible.
      errorPages: ({ status, exception }) =>
        [403, 404, 500, 503].includes(status)
          ? { component: 'Errors/Show', props: { status, reason: (exception as Error).message }, shared: true }
          : undefined,
    }),
  ],
  controllers: [
    AppController,
    DashboardController,
    ContactsController,
    OrganizationsController,
    InfiniteScrollController,
    OncePropsController,
    DottedKeysController,
    ErrorsController,
    PropMergingController,
    DeferredPropsController,
    HistoryController,
    FragmentsController,
    SharedPropsController,
    FormsController,
    NavigationController,
    DataLoadingController,
    PrefetchingController,
    StateController,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SharedPropsMiddleware).forRoutes('{*splat}')
  }
}
