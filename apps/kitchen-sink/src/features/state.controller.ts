import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'

/** State Management: remember, flash data. */
@Controller('features/state')
export class StateController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  // ── remember ─────────────────────────────────────────────────────────────

  @Get('remember')
  @View('Features/State/Remember')
  remember() {
    return { renderedAt: new Date().toISOString() }
  }

  // ── flash data ───────────────────────────────────────────────────────────

  @Get('flash')
  @View('Features/State/Flash')
  flash() {
    return {}
  }

  /** One key: the common case. */
  @Post('flash/message')
  message() {
    return this.view.flash('message', 'A plain message, shown once.').back()
  }

  /** Several keys at once, with structured values: the client reads whatever you put in. */
  @Post('flash/structured')
  structured(@Body('level') level?: string) {
    return this.view
      .flash({
        toast: { level: level ?? 'info', title: 'Structured flash', body: 'An object under one key, a string under another.' },
        status: 'saved',
      })
      .back()
  }

  /** Flash on a render, not a redirect: shows on this response and is gone after. */
  @Get('flash/render')
  @View('Features/State/Flash')
  render() {
    this.view.flash('message', 'Flashed during a GET: visible on this render only.')
    return {}
  }
}
