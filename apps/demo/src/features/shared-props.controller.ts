import { Controller, Get, Inject } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'

/**
 * State Management → Shared Props. `auth` is shared for every page by
 * `SharedPropsMiddleware`; this handler shares one more thing for this page
 * only. The page object lists the keys under `sharedProps`, which is what lets
 * the client keep them on screen while an instant visit's placeholder page is
 * shown.
 */
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
