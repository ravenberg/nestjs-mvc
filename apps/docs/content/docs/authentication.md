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

## In detail

### Which requests go to the login page

Any `401` counts, whichever guard threw it. It turns into a redirect to the login page when the browser wants a page: someone typed the URL, clicked a link or submitted a form. Requests that want data keep the plain `401`, like a `fetch` that asks for JSON or sends `X-Requested-With: XMLHttpRequest`, so your code can react to it.

That also means an API route that someone opens in the browser gets the redirect. A client that calls your API doesn't ask for HTML, so it keeps getting the `401`.

### Keep the login page public

The login page is never sent to itself. If your guard throws a `401` there, the visitor just gets the `401`, so mark your login routes with `@Public()`, like above.

### What intended() remembers

* After a page visit, it's the URL they asked for, query string included.
* After a form, it's the page the form was on, not the URL it posted to. So a guest who submits a comment comes back to the article.
* A protected link that's [prefetched](/docs/prefetching) doesn't count, so hovering it can't overwrite what's remembered.
* Only pages on your own site are remembered.

The address waits for one hour, long enough for a password manager and a 2FA code, in a signed cookie. A visitor who edits that cookie ends up on the fallback.

### A hosted login page

`loginUrl` can be a full URL, like `https://id.example.com/login`, for a login page that lives somewhere else. The browser does a full page load to get there.

With `loginUrl: false`, nothing is redirected: the `401` stays a `401`, and `intended()` always uses its fallback.

### When the user changes

When someone logs out, or a different user logs in, the browser still holds what the previous user loaded. nestjs-mvc notices that on the next request and reloads the page from scratch, so nothing carries over. That works across tabs too: a second tab that still shows the old user's page gets reloaded on its next click.

If that request was a form, it isn't carried out for the new user. The browser goes back to the page the form was on, where the user can submit it again.

### Users without an id

To tell users apart, nestjs-mvc reads `id`, then `sub`, then `_id` from your user. If your user has none of those, nothing gets reset when the user changes, and you get a warning in development. Tell it where the id is:

```ts
auth: { id: (user: Account) => user.accountNumber }
```

### Sharing more under auth

If you share an `auth` object yourself, with permissions for example, `user` is added to it rather than replacing it. And if your guard sets `req.user` but you haven't set `share`, you get a warning in development, because your pages won't see the user.

### Error pages and 401

If your [error pages](/docs/error-pages) return something for a `401`, that wins over the login redirect. Return nothing for `401` to keep the redirect.
