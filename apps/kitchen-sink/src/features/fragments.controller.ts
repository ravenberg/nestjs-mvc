import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'

/**
 * Navigation → URL Fragments. Two things XHR-driven navigation would otherwise
 * lose:
 *
 * - A redirect to `/…#section`: the browser follows an XHR redirect without
 *   its fragment, so the adapter answers `409` + `X-Inertia-Redirect` and the
 *   client visits the URL itself, fragment included.
 * - `preserveFragment()`: after a form on `#profile` posts and redirects back
 *   to the same page, the client keeps `#profile` on the new URL instead of
 *   jumping to the top.
 */
@Controller('features/navigation')
export class FragmentsController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('fragments')
  @View('Features/Navigation/Fragments')
  page() {
    return { savedAt: new Date().toISOString() }
  }

  /** Redirects to a specific section: the client lands there because it performs the visit. */
  @Post('fragments/jump')
  jump(@Body('to') to: string) {
    const section = ['profile', 'security', 'billing'].includes(to) ? to : 'profile'
    return this.view.flash('message', `Redirected to #${section}.`).redirect(`/features/navigation/fragments#${section}`)
  }

  /** Redirects back plainly, but asks the client to keep whatever fragment it visited with. */
  @Post('fragments/save')
  save(@Body('section') section: string) {
    return this.view.preserveFragment().flash('message', `Saved the ${section} section; you are still on it.`).back()
  }
}
