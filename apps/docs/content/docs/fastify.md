---
title: Using Fastify
---

NestJS runs on Express or Fastify. nestjs-mvc works on both, with one exception. {% .lead %}

## What works

Pages, links, forms and validation, redirects, flash messages, error pages, authentication, CSRF protection, signed links and server rendering all work the same on Fastify.

```ts
// src/main.ts
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'

const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())
```

## The exception: the development server

In development nestjs-mvc runs Vite inside your app. That part only works on Express for now.

If you deploy on Fastify, the simplest setup is to develop on Express and run Fastify in production. The rest of your code does not change, as long as you avoid Express specific APIs.

## Avoid Express specific APIs

* **Cookies:** use `readCookie`, `writeCookie` and `clearCookie` from `nestjs-mvc` instead of `res.cookie()`. They work on both.
* **Redirects:** use `ViewService` (`redirect`, `back`, `location`) instead of `res.redirect()`.
* **File uploads:** `FileInterceptor` uses multer, which is Express only. On Fastify use a Fastify multipart plugin.

## Behind a proxy

Trust the proxy on the adapter:

```ts
new FastifyAdapter({ trustProxy: true })
```
