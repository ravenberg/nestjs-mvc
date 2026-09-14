---
title: Installation
---

Add nestjs-mvc to a NestJS project. You need NestJS 12, React 19 and Node 20.19 or newer. {% .lead %}

## Install the packages

In an existing NestJS project:

```sh
npm install nestjs-mvc @inertiajs/react react react-dom
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

`@inertiajs/react` is the browser side of nestjs-mvc. You install it, but you never import it yourself. Everything you need comes from `nestjs-mvc/react`.

## Configure Vite

Vite builds your React pages. Create `vite.config.ts` in the project root:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), nestjsMvc()],
})
```

That is all. You do not write an entry file. The plugin finds your pages in `frontend/pages` and uses `frontend/app.css` if it exists.

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

`vite: {}` starts Vite inside your Nest app while you develop, and serves the built files in production.

## Validate requests

Add a validation pipe in `main.ts`. The exception factory sends validation errors back to your forms. You will use this on the [forms page](/docs/forms).

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

This uses `class-validator`. Install it if you have not yet:

```sh
npm install class-validator class-transformer
```

## TypeScript

Your pages are `.tsx` files. Tell TypeScript about JSX, and keep them out of the server build:

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

Nothing to open yet. On the next page you build your first page.

{% callout title="One process" %}
You do not run Vite in a second terminal. It runs inside your Nest app, on the same port.
{% /callout %}
