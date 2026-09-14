import { Body, Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common'
import { SignedUrls, View, ViewService, type AnyRequest, type AnyResponse } from 'nestjs-mvc'
import { z } from 'zod'
import { AuthService } from './auth.service'
import { Public } from './public.decorator'

const EmailSchema = z.object({ email: z.email('That is not an email address.') })

const PasswordSchema = z
  .object({ password: z.string().min(8, 'At least 8 characters.'), password_confirmation: z.string() })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'The passwords do not match.',
    path: ['password_confirmation'],
  })

/**
 * "Forgot your password": a signed link instead of a table of tokens. The
 * link is bound to the password it is meant to replace (`resetBinding`), so
 * it stops working the moment it has been used, and an hour after it was made.
 *
 * The demo has no mailer, so it shows the link on the page. A real app must
 * not: it would tell anyone whether an address exists. Everything else here
 * is what a real app does.
 */
@Controller()
@Public()
export class PasswordResetController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SignedUrls) private readonly links: SignedUrls,
    @Inject(ViewService) private readonly view: ViewService,
  ) {}

  @Get('forgot-password')
  @View('Auth/ForgotPassword')
  form() {
    return {}
  }

  @Post('forgot-password')
  async send(@Body({ schema: EmailSchema }) body: z.infer<typeof EmailSchema>) {
    const user = await this.auth.byEmail(body.email)
    // The same answer either way: whether the address exists is not ours to tell.
    this.view.flash('message', 'If we know that address, a reset link is on its way.')
    if (user) {
      this.view.flash(
        'demoLink',
        this.links.sign(`/reset-password/${user.id}`, { expiresIn: 3600, bind: this.auth.resetBinding(user) }),
      )
    }
    return this.view.back('/forgot-password')
  }

  @Get('reset-password/:id')
  @View('Auth/ResetPassword')
  async show(@Param('id') id: string, @Req() req: AnyRequest) {
    const user = await this.expect(id, req)
    // The form posts to this same signed URL, so the signature is checked again.
    return { email: user.email, action: (req as { originalUrl?: string; url?: string }).originalUrl ?? req.url }
  }

  @Post('reset-password/:id')
  async reset(
    @Param('id') id: string,
    @Req() req: AnyRequest,
    @Res({ passthrough: true }) res: AnyResponse,
    @Body({ schema: PasswordSchema }) body: z.infer<typeof PasswordSchema>,
  ) {
    const user = await this.expect(id, req)
    await this.auth.setPassword(user, body.password)
    // Signed in straight away, as Laravel's starter kits do; the link that got
    // us here no longer verifies, because the password it was bound to is gone.
    await this.auth.signIn(res, user)
    return this.view.flash('message', 'Your password was changed.').intended('/dashboard')
  }

  /** The user this link belongs to, or back to the form with a message. */
  private async expect(id: string, req: AnyRequest) {
    const user = await this.auth.withPassword(Number(id))
    if (!user || !this.links.verify(req, { bind: this.auth.resetBinding(user) })) {
      // The message belongs to the page, not to a field.
      this.view.flash('message', 'That reset link is no longer valid. Ask for a new one.')
      return this.view.redirect('/forgot-password')
    }
    return user
  }
}
