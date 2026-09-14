import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../database/entities/user.entity'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { EmailVerificationController } from './email-verification.controller'
import { PasswordResetController } from './password-reset.controller'

/** The token's signing secret: required in production, a fixed value in development so a restart keeps you logged in. */
function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') throw new Error('Set JWT_SECRET to start the kitchen sink in production.')
  return 'kitchen-sink-development-only'
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({ secret: jwtSecret() }),
    // Five login attempts a minute per email address and IP; see LoginThrottlerGuard.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AuthController, PasswordResetController, EmailVerificationController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
