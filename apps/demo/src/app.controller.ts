import { Body, Controller, Get, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { View, ValidationException, defer } from 'nestjs-mvc'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const messages: string[] = []

@Controller()
export class AppController {
  @Get()
  @View('Home')
  home() {
    return {
      framework: 'NestJS',
      serverTime: new Date().toISOString(),
      messages,
    }
  }

  @Get('users')
  @View('Users')
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
    const trimmed = message?.trim() ?? ''
    if (trimmed.length < 3) {
      // With class-validator you'd let ValidationPipe throw this via
      // `exceptionFactory: inertiaExceptionFactory` instead.
      throw new ValidationException({ message: 'A message needs at least 3 characters.' })
    }
    messages.push(trimmed)
    res.redirect('/')
  }
}
