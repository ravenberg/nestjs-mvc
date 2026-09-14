---
title: Installation
---

Here's how to add nestjs-mvc to a NestJS project. You'll need NestJS 12, React 19 and Node 20.19 or newer. {% .lead %}

## Install the packages

Run this in your NestJS project:

```sh
npm install nestjs-mvc @inertiajs/react react react-dom
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

`@inertiajs/react` is what runs nestjs-mvc in the browser. It needs to be installed, but you'll import everything from `nestjs-mvc/react`, so you won't use it directly.

## Configure Vite

Vite builds your React pages. Create a `vite.config.ts` in the root of your project:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), nestjsMvc()],
})
```

You don't need an entry file. The plugin looks for your pages in `frontend/pages`, and if there's a `frontend/app.css` it loads that too.

## Register the module

Import `MvcModule` in your root module:

```ts
// src/app.module.ts
import { Module } from '@nestjs/common'
import { MvcModule } from 'nestjs-mvc'

@Module({
  imports: [MvcModule.forRoot({ vite: {} })],
})
export class AppModule {}
```

With `vite: {}`, Vite runs inside your Nest app while you're developing. In production it serves the files you built instead.

## Validate requests

Add a validation pipe in `main.ts`. The exception factory is what sends validation errors back to your forms, which you'll see on the [forms page](/docs/forms).

```ts
// src/main.ts
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { validationExceptionFactory } from 'nestjs-mvc'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
  await app.listen(3000)
}
bootstrap()
```

This uses `class-validator`, so install it if you haven't already:

```sh
npm install class-validator class-transformer
```

## TypeScript

Your pages are `.tsx` files. TypeScript needs to know about JSX, and the pages should stay out of your server build:

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "frontend"]
}
```

## Start the app

```sh
npm run start:dev
```

There's nothing to look at yet. You'll build your first page next.

{% callout title="One process" %}
Vite runs inside your Nest app on the same port, so you won't need a second terminal for it.
{% /callout %}
