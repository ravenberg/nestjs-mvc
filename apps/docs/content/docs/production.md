---
title: Going to production
---

Here's a checklist for putting your app online. {% .lead %}

## 1. Build the frontend

```sh
npx vite build
```

That writes your pages to `dist/client`, plus `dist/ssr` for [server rendering](/docs/server-rendering). You build your Nest app the way you normally would.

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

On Fastify this works a bit differently, so have a look at [Using Fastify](/docs/fastify#serving-the-built-files).

## 3. Set NODE_ENV and APP_KEY

```sh
NODE_ENV=production
APP_KEY=your-secret-key
```

nestjs-mvc signs cookies and links with `APP_KEY`, and in production the app won't start without it. You can generate one like this:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Keep it secret, and give every server running the app the same key.

When you want to change the key, put the new one in `APP_KEY` and the old one in `APP_PREVIOUS_KEYS`, and remove the old one after a few days.

## 4. Reload open tabs after a deploy

People who have your app open are still running the old code after you deploy. If you give each build a version, nestjs-mvc tells those tabs to reload on their next click:

```ts
MvcModule.forRoot({
  vite: {},
  version: process.env.GIT_COMMIT,
})
```

Any value that changes with every deploy works.

## 5. Behind a proxy

Most hosts put a proxy in front of your app. Tell Express to trust it in `bootstrap()`, so your app knows its real address:

```ts
app.set('trust proxy', 1)
```

You can also set your public address directly:

```ts
MvcModule.forRoot({ vite: {}, url: 'https://app.example.com' })
```

## 6. One process is enough

Your Nest app serves the pages, the data and the built files, and renders on the server when a route asks for it. That's the only thing you deploy.
