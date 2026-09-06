import { Controller, Get, Inject, Post } from '@nestjs/common'
import { EncryptHistory, View, ViewService } from 'nestjs-mvc'

/**
 * Navigation → History Management. `@EncryptHistory()` asks the client to
 * encrypt this page's history entry, so its props cannot be read back from
 * the browser after the user leaves; the "log out" POST calls `clearHistory()`,
 * which rides the flash bag to the redirect target and tells the client to
 * rotate its key and drop what it stored.
 */
@Controller('features/navigation')
export class HistoryController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('history')
  @View('Features/Navigation/History')
  @EncryptHistory()
  page() {
    return {
      // Pretend-sensitive data: with encryption on, DevTools cannot read it
      // out of `history.state` once you navigate away.
      secret: { iban: 'NL91 ABNA 0417 1643 00', note: 'Only for the eyes of the logged-in user' },
      visitedAt: new Date().toISOString(),
    }
  }

  @Post('history/logout')
  logout() {
    return this.view.clearHistory().flash('message', 'History cleared: the key was rotated and stored pages are gone.').back()
  }
}
