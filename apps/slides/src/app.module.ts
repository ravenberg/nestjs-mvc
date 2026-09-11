import { fileURLToPath } from 'node:url'
import { Module } from '@nestjs/common'
import { MvcModule } from 'nestjs-mvc'
import { DecksController } from './decks/decks.controller'
import { DecksService } from './decks/decks.service'
import { template } from './template'

const root = fileURLToPath(new URL('..', import.meta.url))

@Module({
  imports: [MvcModule.forRoot({ version: 'dev', template, vite: { root } })],
  controllers: [DecksController],
  providers: [DecksService],
})
export class AppModule {}
