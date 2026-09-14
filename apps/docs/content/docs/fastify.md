---
title: Using Fastify
---

nestjs-mvc works the same on Fastify as it does on Express, development server and hot reload included. This page covers the few lines you'll need to change in the examples from these docs. {% .lead %}

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

Your pages, controllers, middleware and guards can stay the way they are.

## Cookies

The [Authentication](/docs/authentication) example sets the login cookie with `res.cookie()`, but that method only exists on Express. The helpers from `nestjs-mvc` work on both:

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

There are two differences from `res.cookie()`. `maxAge` is in seconds, and you write `sameSite` as `'Lax'`.

## Redirects

Always redirect with `ViewService` (`redirect`, `back` or `location`). On Fastify a plain `reply.redirect()` loses your [flash messages](/docs/flash-messages), and it won't switch to status `303` after a `PUT`, `PATCH` or `DELETE`.

## File uploads

The [File uploads](/docs/file-uploads) example uses `FileInterceptor`, which NestJS only supports on Express. On Fastify you install `@fastify/multipart` instead:

```sh
npm install @fastify/multipart
```

Register it in `bootstrap()`, with the largest file you accept:

```ts
import fastifyMultipart from '@fastify/multipart'

await app.register(fastifyMultipart, { limits: { fileSize: 2 * 1024 * 1024 } })
```

Then read the form in the handler with `req.parts()`:

```ts
import type { Multipart } from '@fastify/multipart'
import { Controller, PayloadTooLargeException, Post, Req } from '@nestjs/common'
import { ValidationException, ViewService } from 'nestjs-mvc'

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly avatars: AvatarService,
    private readonly view: ViewService,
  ) {}

  @Post('avatar')
  async upload(@Req() req: { parts(): AsyncIterableIterator<Multipart> }) {
    let avatar: Buffer | undefined

    try {
      for await (const part of req.parts()) {
        if (part.type === 'file') avatar = await part.toBuffer()
      }
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') throw new PayloadTooLargeException()
      throw error
    }

    if (!avatar) {
      throw new ValidationException({ avatar: 'Pick a file first.' })
    }

    await this.avatars.save(avatar)
    return this.view.flash('message', 'Avatar updated.').back()
  }
}
```

`req.parts()` gives you every file and text field in the form. When a file is over the limit, it throws an error with the code `FST_REQ_FILE_TOO_LARGE`. Turn that into a `PayloadTooLargeException` like above, because otherwise NestJS answers with a 500. Your page code stays the same, and `ValidationException` still puts the error on the field.

## Serving the built files

In production you serve `dist/client` with `@fastify/static`:

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

{% callout title="Skip app.useStaticAssets()" type="warning" %}
The NestJS docs use `app.useStaticAssets()` for this. On Fastify with NestJS 12 that call doesn't wait for the plugin, so `app.listen()` never finishes and the app looks like it started but never answers. Register `@fastify/static` yourself and `await` it, like above.
{% /callout %}

## Behind a proxy

Tell the adapter to trust the proxy:

```ts
new FastifyAdapter({ trustProxy: true })
```
