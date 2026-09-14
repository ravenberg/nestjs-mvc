import { Body, Controller, Get, Inject, Post, Res, UseGuards } from '@nestjs/common'
import { SignedUrls, ValidationException, View, ViewService, type AnyResponse } from 'nestjs-mvc'
import { z } from 'zod'
import type { User } from '../database/entities/user.entity'
import { AuthService } from './auth.service'
import { EmailVerificationController } from './email-verification.controller'
import { LoginThrottlerGuard } from './login-throttler.guard'
import { CurrentUser, Public } from './public.decorator'

const LoginSchema = z.object({
  email: z.email('That is not an email address.'),
  password: z.string().min(1, 'Your password, please.'),
  remember: z.coerce.boolean().optional(),
})

const RegisterSchema = z
  .object({
    name: z.string().trim().min(2, 'A name of at least 2 characters.'),
    email: z.email('That is not an email address.'),
    password: z.string().min(8, 'At least 8 characters.'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'The passwords do not match.',
    path: ['password_confirmation'],
  })

/**
 * Register, log in, log out: ordinary NestJS handlers. What nestjs-mvc adds is
 * `intended()` after a login, and nothing else — the redirect to `/login` on
 * a 401, `auth.user` on every page and the client reset after a login or a
 * logout all follow from the guard and `auth.share` in `kitchen-sink.module.ts`.
 */
@Controller()
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ViewService) private readonly view: ViewService,
    @Inject(SignedUrls) private readonly links: SignedUrls,
  ) {}

  @Get('login')
  @Public()
  @View('Auth/Login')
  loginPage(@CurrentUser() user: User | undefined) {
    if (user) return this.view.redirect('/dashboard')
    return {}
  }

  @Post('login')
  @Public()
  @UseGuards(LoginThrottlerGuard)
  async login(@Body({ schema: LoginSchema }) body: z.infer<typeof LoginSchema>, @Res({ passthrough: true }) res: AnyResponse) {
    const user = await this.auth.attempt(body.email, body.password)
    if (!user) throw new ValidationException({ email: 'These credentials do not match our records.' })
    await this.auth.signIn(res, user, body.remember)
    return this.view.intended('/dashboard')
  }

  @Get('register')
  @Public()
  @View('Auth/Register')
  registerPage(@CurrentUser() user: User | undefined) {
    if (user) return this.view.redirect('/dashboard')
    return {}
  }

  @Post('register')
  @Public()
  async register(@Body({ schema: RegisterSchema }) body: z.infer<typeof RegisterSchema>, @Res({ passthrough: true }) res: AnyResponse) {
    if (await this.auth.emailTaken(body.email)) throw new ValidationException({ email: 'That email address is already registered.' })
    const user = await this.auth.register(body)
    await this.auth.signIn(res, user)
    return this.view
      .flash('message', `Welcome, ${user.name}. Confirm your email address to finish.`)
      // A real app mails this link; the demo shows it. See EmailVerificationController.
      .flash('demoLink', EmailVerificationController.link(this.links, user))
      .intended('/dashboard')
  }

  /** Public, so an expired token can still log out. The next page load resets the client by itself. */
  @Post('logout')
  @Public()
  logout(@Res({ passthrough: true }) res: AnyResponse) {
    this.auth.signOut(res)
    return this.view.redirect('/login')
  }
}
