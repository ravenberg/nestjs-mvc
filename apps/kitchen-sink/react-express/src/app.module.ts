import { fileURLToPath } from 'node:url'
import { Module } from '@nestjs/common'
import { KitchenSinkModule } from 'kitchen-sink/server'
import { UploadController } from './upload.controller'

@Module({
  imports: [KitchenSinkModule.forRoot({ root: fileURLToPath(new URL('..', import.meta.url)), platform: 'express' })],
  // The one handler Express and Fastify cannot share.
  controllers: [UploadController],
})
export class AppModule {}
