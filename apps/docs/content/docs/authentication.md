---
title: Authentication
---

You log users in the NestJS way, with a guard, and nestjs-mvc helps that guard work well with pages. {% .lead %}

## What nestjs-mvc adds

You write the login yourself, and nestjs-mvc handles what pages need around it:

* A guest who opens a protected page is sent to `/login`, and back to that page after logging in.
* The logged in user is available on every page.
* When someone logs out or another user logs in, the browser forgets everything from the previous user.

## A guard

This is the guard from the NestJS docs with one change. The token lives in a cookie instead of a header, because browsers send cookies on their own and JavaScript can't read an `HttpOnly` cookie.

```ts
// src/auth/auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { readCookie } from 'nestjs-mvc'
import { IS_PUBLIC_KEY } from './public.decorator'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest()
    const token = readCookie(req, 'access_token')
    const payload = token ? await this.jwt.verifyAsync(token).catch(() => null) : null
    req.user = payload ? await this.users.findOne(payload.sub) : undefined

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])
    if (!isPublic && !req.user) throw new UnauthorizedException()
    return true
  }
}
```

```ts
// src/auth/public.decorator.ts
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
```

Register it for every route in your auth module:

```ts
providers: [{ provide: APP_GUARD, useClass: AuthGuard }]
```

{% callout title="Find the user on every request" %}
The guard looks up the user on public routes as well and only refuses access on protected ones. Your layout shows the logged in user on every page, public ones included, so it always needs to know who that is.
{% /callout %}

## Log in

```ts
// src/auth/auth.controller.ts
@Controller()
@Public()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly view: ViewService,
  ) {}

  @Get('login')
  @View('Login')
  loginPage() {
    return {}
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validate(dto.email, dto.password)
    if (!user) throw new ValidationException({ email: 'Wrong email or password.' })

    const token = await this.auth.createToken(user)
    res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax' })

    return this.view.intended('/dashboard')
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token')
    return this.view.redirect('/login')
  }
}
```

`intended('/dashboard')` sends the user to the page they were trying to open before they had to log in, or to `/dashboard` if there wasn't one.

## The protected page

A protected page looks like any other page. The guard protects it because it doesn't have `@Public()`:

```ts
@Controller('dashboard')
export class DashboardController {
  @Get()
  @View('Dashboard')
  index() {
    return { stats: this.stats.today() }
  }
}
```

A guest who opens `/dashboard` ends up on `/login`, while a request that asks for JSON still gets the usual `401`.

## Show the user on every page

Tell nestjs-mvc which fields of the user your pages are allowed to see:

```ts
MvcModule.forRoot({
  vite: {},
  auth: {
    share: (user: User) => ({ id: user.id, name: user.name }),
  },
})
```

{% framework-code %}
```tsx
import { Link, usePage } from 'nestjs-mvc/react'

function UserMenu() {
  const { props } = usePage<{ auth: { user: { name: string } | null } }>()

  if (!props.auth.user) return <Link href="/login">Log in</Link>

  return (
    <>
      {props.auth.user.name}
      <Link href="/logout" method="post" as="button">Log out</Link>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { Link, usePage } from 'nestjs-mvc/vue'

const page = usePage<{ auth: { user: { name: string } | null } }>()
</script>

<template>
  <Link v-if="!page.props.auth.user" href="/login">Log in</Link>
  <template v-else>
    {{ page.props.auth.user.name }}
    <Link href="/logout" method="post" as="button">Log out</Link>
  </template>
</template>
```
{% /framework-code %}

`auth.user` is `null` for a guest.

{% callout title="Pick the fields" type="warning" %}
Only what `share` returns reaches the browser. Never return the whole user, because it might contain a password hash.
{% /callout %}

## Using Passport

Passport works too. `AuthGuard('jwt')` from `@nestjs/passport` puts the user on `req.user` and throws an `UnauthorizedException`, and that's all nestjs-mvc needs.

## Options

```ts
auth: {
  loginUrl: '/signin',          // where guests go, default '/login'
  share: (user) => ({ ... }),   // what pages see as auth.user
  user: (req) => req.account,   // where your guard puts the user, default req.user
}
```

The [kitchen sink](https://github.com/ravenberg/nestjs-mvc/tree/main/apps/kitchen-sink/shared/server/auth) has a complete example with registration, password hashing, a password reset and login throttling.
