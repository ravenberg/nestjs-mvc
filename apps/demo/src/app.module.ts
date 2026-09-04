import { Module } from '@nestjs/common'
import { MvcModule } from 'nestjs-mvc'
import { AppController } from './app.controller'
import { template } from './template'

const root = new URL('..', import.meta.url).pathname

@Module({
  imports: [
    MvcModule.forRoot({
      version: 'dev',
      template,
      // Runs Vite in-process during dev; resolves hashed manifest assets in production.
      vite: { entry: 'frontend/main.tsx', root },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
