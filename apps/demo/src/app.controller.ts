import { Body, Controller, Get, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Inertia, defer } from '@nestjs-inertia/core'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const messages: string[] = []

@Controller()
export class AppController {
  @Get()
  @Inertia('Home')
  home() {
    return {
      framework: 'NestJS',
      serverTime: new Date().toISOString(),
      messages,
    }
  }

  @Get('users')
  @Inertia('Users')
  users() {
    return {
      // Deferred: excluded from the first response, fetched by the client right after render.
      users: defer(async () => {
        await sleep(800)
        return [
          { id: 1, name: 'Ada Lovelace' },
          { id: 2, name: 'Grace Hopper' },
          { id: 3, name: 'Margaret Hamilton' },
        ]
      }),
    }
  }

  @Post('messages')
  storeMessage(@Body('message') message: string, @Res() res: Response) {
    if (message?.trim()) messages.push(message.trim())
    res.redirect('/')
  }
}
