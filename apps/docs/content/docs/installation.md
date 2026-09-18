---
title: Installation
---

Here's how to add nestjs-mvc to a NestJS project. You'll need NestJS 12, React 19 or Vue 3.5, and Node 20.19+, 22.12+ or 24+. {% .lead %}

Every page in these docs shows its examples in React or in Vue. Pick yours, and the whole site follows:

{% framework-switch /%}

## Install the packages

Run this in your NestJS project:

{% framework name="react" %}
```sh
npm install nestjs-mvc @inertiajs/react react react-dom
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

`@inertiajs/react` is what runs nestjs-mvc in the browser. It needs to be installed, but you'll import everything from `nestjs-mvc/react`, so you won't use it directly.
{% /framework %}

{% framework name="vue" %}
```sh
npm install nestjs-mvc @inertiajs/vue3 vue
npm install -D vite @vitejs/plugin-vue vue-tsc
```

`@inertiajs/vue3` is what runs nestjs-mvc in the browser. It needs to be installed, but you'll import everything from `nestjs-mvc/vue`, so you won't use it directly.
{% /framework %}

## Configure Vite

Vite builds your pages. Create a `vite.config.ts` in the root of your project:

{% framework name="react" %}
```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), nestjsMvc()],
})
```
{% /framework %}

{% framework name="vue" %}
```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), nestjsMvc()],
})
```
{% /framework %}

You don't need an entry file. The plugin sees in your `package.json` whether you use React or Vue, looks for your pages in `frontend/pages`, and if there's a `frontend/app.css` it loads that too.

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

Rather use Zod? [Validation](/docs/validation) shows how to set that up instead.

## TypeScript

Your server and your pages are compiled differently. Nest compiles the server with `tsc`, and Vite builds your pages. So keep the pages out of the server build:

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "frontend"]
}
```

And give the pages a config of their own, with the options Vite reads them with. Imports don't need a file extension there, and importing a stylesheet or an image type-checks:

{% framework name="react" %}
```json
// frontend/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["."]
}
```

Your editor picks it up by itself. To check your pages from the command line, run `npx tsc -p frontend`.
{% /framework %}

{% framework name="vue" %}
Your pages are `.vue` files, which `tsc` can't read. `vue-tsc` can:

```json
// tsconfig.vue.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["frontend/**/*.vue", "frontend/**/*.ts"]
}
```

```sh
npx vue-tsc -p tsconfig.vue.json
```
{% /framework %}

## Start the app

```sh
npm run start:dev
```

There's nothing to look at yet. You'll build your first page next.

{% callout title="One process" %}
Vite runs inside your Nest app on the same port, so you won't need a second terminal for it.
{% /callout %}
