import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common'
import { View } from 'nestjs-mvc'
import { DecksService } from './decks.service'

@Controller()
export class DecksController {
  constructor(@Inject(DecksService) private readonly decks: DecksService) {}

  @Get('/')
  @View('Decks/Index')
  async index() {
    return { decks: await this.decks.list() }
  }

  @Get('decks/:slug')
  @View('Decks/Show')
  async show(@Param('slug') slug: string) {
    const deck = await this.decks.find(slug)
    if (!deck) throw new NotFoundException(`No deck named ${slug}`)
    return deck
  }
}
