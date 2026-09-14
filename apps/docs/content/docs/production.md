---
title: Going to production
---

A checklist for putting your app online. {% .lead %}

## 1. Build the frontend

```sh
npx vite build
```

This writes your pages to `dist/client`, and to `dist/ssr` for [server rendering](/docs/server-rendering). Build your Nest app as usual.

## 2. Serve the built files

Serve `dist/client` under `/build`:

```ts
// src/main.ts
import type { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  if (process.env.NODE_ENV === 'production') {
    app.useStaticAssets(join(process.cwd(), 'dist/client'), { prefix: '/build/' })
  }

  await app.listen(3000)
}
bootstrap()
```

On Fastify this works differently; see [Using Fastify](/docs/fastify#serving-the-built-files).

## 3. Set NODE_ENV and APP_KEY

```sh
NODE_ENV=production
APP_KEY=your-secret-key
```

nestjs-mvc signs cookies and links with `APP_KEY`. In production the app does not start without it. Generate one:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Keep it secret, and give every server running the app the same key.

To change the key, put the new one in `APP_KEY` and the old one in `APP_PREVIOUS_KEYS`. Remove the old one after a few days.

## 4. Reload open tabs after a deploy

Users with your app open still run the old code after you deploy. Give each build a version, and nestjs-mvc tells those tabs to reload on their next click:

```ts
MvcModule.forRoot({
  vite: {},
  version: process.env.GIT_COMMIT,
})
```

Any value that changes with every deploy works.

## 5. Behind a proxy

Most hosts put a proxy in front of your app. Tell Express to trust it, so your app knows its real address. In `bootstrap()`:

```ts
app.set('trust proxy', 1)
```

Or set your public address directly:

```ts
MvcModule.forRoot({ vite: {}, url: 'https://app.example.com' })
```

## 6. One process is enough

There is no separate frontend server to deploy. Your Nest app serves the pages, the data and the built files, and renders on the server when a route asks for it.
