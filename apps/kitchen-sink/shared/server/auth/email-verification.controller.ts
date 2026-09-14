import { Controller, Get, Inject, Param, Post, Req } from '@nestjs/common'
import { SignedUrls, ViewService, type AnyRequest } from 'nestjs-mvc'
import type { User } from '../database/entities/user.entity'
import { AuthService } from './auth.service'
import { CurrentUser, Public } from './public.decorator'

/**
 * Confirming an email address with a signed link, bound to the address it
 * confirms: changing the address makes every older link useless, and there is
 * nothing to store or clean up. A day to use it.
 *
 * As with the reset, the demo shows the link instead of mailing it.
 */
@Controller()
export class EmailVerificationController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SignedUrls) private readonly links: SignedUrls,
    @Inject(ViewService) private readonly view: ViewService,
  ) {}

  /** The link to send; also used right after registering. */
  static link(links: SignedUrls, user: User): string {
    return links.sign(`/verify-email/${user.id}`, { expiresIn: 24 * 3600, bind: `verify:${user.email}` })
  }

  @Get('verify-email/:id')
  @Public()
  async verify(@Param('id') id: string, @Req() req: AnyRequest) {
    const user = await this.auth.byId(Number(id))
    if (!user || !this.links.verify(req, { bind: `verify:${user.email}` })) {
      return this.view.flash('message', 'That verification link is no longer valid.').redirect('/dashboard')
    }
    if (!user.emailVerifiedAt) await this.auth.markEmailVerified(user)
    return this.view.flash('message', 'Your email address is verified.').redirect('/dashboard')
  }

  @Post('verify-email/resend')
  resend(@CurrentUser() user: User) {
    return this.view
      .flash('message', 'A new verification link is on its way.')
      .flash('demoLink', EmailVerificationController.link(this.links, user))
      .back('/dashboard')
  }
}
