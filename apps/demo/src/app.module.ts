import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MvcModule } from 'nestjs-mvc'
import { AppController } from './app.controller'
import { ContactsController } from './crm/contacts.controller'
import { DashboardController } from './crm/dashboard.controller'
import { OrganizationsController } from './crm/organizations.controller'
import { DatabaseModule } from './database/database.module'
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
    }),
  ],
  controllers: [AppController, DashboardController, ContactsController, OrganizationsController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SharedPropsMiddleware).forRoutes('{*splat}')
  }
}
