---
title: Using Fastify
---

nestjs-mvc works the same on Fastify as on Express, including the development server and hot reload. This page lists the few lines to change in the examples from these docs. {% .lead %}

## Switch to Fastify

```sh
npm install @nestjs/platform-fastify
```

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())
  await app.listen(3000)
}
bootstrap()
```

Your pages, controllers, middleware and guards stay as they are.

## Cookies

The [Authentication](/docs/authentication) example sets the login cookie with `res.cookie()`. That method only exists on Express. Use the helpers from `nestjs-mvc`, which work on both:

```ts
import { clearCookie, writeCookie, type AnyResponse } from 'nestjs-mvc'

@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: AnyResponse) {
  // ...check the password
  writeCookie(res, 'access_token', token, { httpOnly: true, sameSite: 'Lax' })
  return this.view.intended('/dashboard')
}

@Post('logout')
logout(@Res({ passthrough: true }) res: AnyResponse) {
  clearCookie(res, 'access_token')
  return this.view.redirect('/login')
}
```

Two differences with `res.cookie()`: `maxAge` is in seconds, and `sameSite` is written `'Lax'`.

## Redirects

Always redirect with `ViewService` (`redirect`, `back`, `location`). On Fastify, a plain `reply.redirect()` loses your [flash messages](/docs/flash-messages) and does not switch to status `303` after a `PUT`, `PATCH` or `DELETE`.

## File uploads

The [File uploads](/docs/file-uploads) example uses `FileInterceptor`, which NestJS only supports on Express. On Fastify, receive files with [`@fastify/multipart`](https://www.npmjs.com/package/@fastify/multipart). The page code stays the same, and throwing a `ValidationException` still puts the error on the field.

## Serving the built files

In production, serve `dist/client` with `@fastify/static`:

```sh
npm install @fastify/static
```

```ts
import fastifyStatic from '@fastify/static'
import { join } from 'node:path'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())

  if (process.env.NODE_ENV === 'production') {
    await app.register(fastifyStatic, { root: join(process.cwd(), 'dist/client'), prefix: '/build/' })
  }

  await app.listen(3000)
}
```

{% callout title="Not app.useStaticAssets()" type="warning" %}
The NestJS docs use `app.useStaticAssets()` for this. On Fastify with NestJS 12 that call does not wait for the plugin, and `app.listen()` never finishes: the app looks started but does not answer. Register `@fastify/static` yourself and `await` it, as above.
{% /callout %}

## Behind a proxy

Trust the proxy on the adapter:

```ts
new FastifyAdapter({ trustProxy: true })
```
