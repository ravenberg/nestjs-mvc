import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { writeCookie, clearCookie, type AnyResponse } from 'nestjs-mvc'
import { Repository } from 'typeorm'
import { User } from '../database/entities/user.entity'
import { hashPassword, verifyPassword } from './passwords'

/** The HttpOnly cookie that carries the token: JavaScript on the page cannot read it. */
export const ACCESS_TOKEN_COOKIE = 'access_token'

const THIRTY_DAYS = 30 * 24 * 60 * 60

/**
 * Who you are, the NestJS docs' way: a JWT from `@nestjs/jwt`, with the user
 * id as `sub`. The only change from the docs is where the token travels — an
 * `HttpOnly` cookie instead of an `Authorization` header — because a browser
 * sends a cookie by itself and page scripts can never read it.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  /** The user with this email and password, or `null`; the same time either way. */
  async attempt(email: string, password: string): Promise<User | null> {
    const user = await this.users.findOne({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, passwordHash: true },
    })
    const valid = await verifyPassword(password, user?.passwordHash)
    return valid && user ? user : null
  }

  /** The user with this address, password hash included; `null` when there is none. */
  byEmail(email: string): Promise<User | null> {
    return this.users.findOne({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, passwordHash: true },
    })
  }

  async emailTaken(email: string): Promise<boolean> {
    return (await this.users.countBy({ email: email.trim().toLowerCase() })) > 0
  }

  async register(input: { name: string; email: string; password: string }): Promise<User> {
    const user = this.users.create({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: await hashPassword(input.password),
    })
    return this.users.save(user)
  }

  byId(id: number): Promise<User | null> {
    return this.users.findOneBy({ id })
  }

  /** The user with this id, with the password hash, which every query leaves out by default. */
  withPassword(id: number): Promise<User | null> {
    return this.users.findOne({ where: { id }, select: { id: true, name: true, email: true, passwordHash: true } })
  }

  /**
   * What a password-reset link is bound to: the password it is meant to
   * replace. Changing the password changes this, so the link stops working
   * the moment it has been used — single use without a table of tokens.
   */
  resetBinding(user: User): string {
    return `reset:${user.passwordHash ?? 'none'}`
  }

  async setPassword(user: User, password: string): Promise<void> {
    await this.users.update(user.id, { passwordHash: await hashPassword(password) })
  }

  async markEmailVerified(user: User): Promise<void> {
    await this.users.update(user.id, { emailVerifiedAt: new Date() })
  }

  /** The user a token belongs to, or `null` when it is missing, forged, expired, or the user is gone. */
  async userFromToken(token: string): Promise<User | null> {
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: number }>(token)
      return await this.users.findOneBy({ id: sub })
    } catch {
      return null
    }
  }

  /** Logs `user` in on this response; `remember` keeps the cookie for 30 days instead of the browser session. */
  async signIn(res: AnyResponse, user: User, remember = false): Promise<void> {
    const token = await this.jwt.signAsync({ sub: user.id }, { expiresIn: remember ? '30d' : '2h' })
    writeCookie(res, ACCESS_TOKEN_COOKIE, token, {
      maxAge: remember ? THIRTY_DAYS : undefined,
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  signOut(res: AnyResponse): void {
    clearCookie(res, ACCESS_TOKEN_COOKIE, { secure: process.env.NODE_ENV === 'production' })
  }
}
