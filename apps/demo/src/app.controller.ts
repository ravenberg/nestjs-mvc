import { Body, Controller, Get, Post, Redirect, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Ssr, ValidationException, View } from 'nestjs-mvc'

const messages: string[] = []

@Controller()
export class AppController {
  @Get()
  @Redirect('/dashboard', 302)
  root() {
    // The CRM dashboard is the app's entry point, mirroring the official demo.
  }

  /** Opted into SSR: the only route in the demo that is, so the difference is visible. */
  @Get('features/forms/validation')
  @View('Features/Forms/Validation')
  @Ssr()
  validation() {
    return { messages }
  }

  /** Same component without the decorator — client-rendered, like every other page. */
  @Get('features/forms/validation-csr')
  @View('Features/Forms/Validation')
  validationWithoutSsr() {
    return { messages }
  }

  @Post('features/forms/validation')
  storeMessage(@Body('message') message: string, @Res() res: Response) {
    const trimmed = message?.trim() ?? ''
    if (trimmed.length < 3) {
      // With class-validator you'd let ValidationPipe throw this via
      // `exceptionFactory: validationExceptionFactory` instead.
      throw new ValidationException({ message: 'A message needs at least 3 characters.' })
    }
    messages.push(trimmed)
    res.redirect('/features/forms/validation')
  }
}
