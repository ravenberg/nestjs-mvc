---
title: Authentication
---

Log users in the NestJS way, with a guard. nestjs-mvc does not replace it. It makes your guard work well with pages. {% .lead %}

## What nestjs-mvc adds

You write the login. nestjs-mvc takes care of what pages need around it:

* A guest who opens a protected page goes to `/login`, and back to that page after logging in.
* The logged in user is available on every page.
* When someone logs out, or another user logs in, nothing from the previous user stays in the browser.

## A guard

This is the guard from the NestJS docs, with one change: the token lives in a cookie instead of a header. Browsers send cookies by themselves, and JavaScript cannot read an `HttpOnly` cookie.

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
The guard looks up the user on public routes too, and only refuses on protected ones. Your layout shows the logged in user on every page, including public pages, so it always needs to know.
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

`intended('/dashboard')` sends the user to the page they tried to open before they had to log in. If there is none, it goes to `/dashboard`.

## The protected page

Nothing special. The guard protects it, because it has no `@Public()`:

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

A guest who opens `/dashboard` lands on `/login`. A request that asks for JSON still gets the normal `401`.

## Show the user on every page

Tell nestjs-mvc which fields of the user the pages may see:

```ts
MvcModule.forRoot({
  vite: {},
  auth: {
    share: (user: User) => ({ id: user.id, name: user.name }),
  },
})
```

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

`auth.user` is `null` for a guest.

{% callout title="Pick the fields" type="warning" %}
Only what `share` returns reaches the browser. Never return the whole user: it may contain a password hash.
{% /callout %}

## Using Passport

Passport works too. `AuthGuard('jwt')` from `@nestjs/passport` puts the user on `req.user` and throws `UnauthorizedException`, which is all nestjs-mvc needs.

## Options

```ts
auth: {
  loginUrl: '/signin',          // where guests go, default '/login'
  share: (user) => ({ ... }),   // what pages see as auth.user
  user: (req) => req.account,   // where your guard puts the user, default req.user
}
```

The [kitchen sink](https://github.com/ravenberg/nestjs-mvc/tree/main/apps/kitchen-sink/shared/server/auth) has a complete example with registration, password hashing, a password reset and login throttling.
