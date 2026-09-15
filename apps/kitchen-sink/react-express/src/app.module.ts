import { fileURLToPath } from 'node:url'
import { Module } from '@nestjs/common'
import { UploadController } from 'kitchen-sink/platform/express'
import { KitchenSinkModule } from 'kitchen-sink/server'

@Module({
  imports: [KitchenSinkModule.forRoot({ root: fileURLToPath(new URL('..', import.meta.url)), platform: 'express', framework: 'react' })],
  // The one handler Express and Fastify cannot share.
  controllers: [UploadController],
})
export class AppModule {}
