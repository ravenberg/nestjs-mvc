import { Module } from '@nestjs/common'
import { InertiaModule } from '@nestjs-inertia/core'
import { AppController } from './app.controller'
import { template } from './template'

@Module({
  imports: [
    InertiaModule.forRoot({
      version: 'dev',
      template,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
