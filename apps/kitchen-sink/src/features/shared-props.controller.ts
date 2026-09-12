import { Controller, Get, Inject } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'
import { Public } from '../auth/public.decorator'

/**
 * State Management → Shared Props. `auth.user` comes from `auth.share` in
 * `app.module.ts` (nestjs-mvc adds it after the guards ran),
 * `auth.notifications` from `SharedPropsMiddleware`, and this handler shares
 * one more thing for this page only. The page object lists the keys under
 * `sharedProps`, which is what lets the client keep them on screen while an
 * instant visit's placeholder page is shown.
 */
@Public()
@Controller('features/state')
export class SharedPropsController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('shared-props')
  @View('Features/State/SharedProps')
  page() {
    this.view.share('locale', { code: 'nl-NL', timezone: 'Europe/Amsterdam' })
    return { pageOnly: 'This prop is not shared; it belongs to this page alone.' }
  }
}
