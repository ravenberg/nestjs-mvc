# nestjs-mvc

Modern [Inertia.js](https://inertiajs.com) adapter for NestJS (Express platform). See the [repository README](../../README.md) for the project overview.

## Install

```sh
pnpm add nestjs-mvc
```

Peer dependencies: `@nestjs/common`, `@nestjs/core` and `@nestjs/platform-express` `^12`, `reflect-metadata ^0.2`, `rxjs ^7`. `vite` is an optional peer — only needed if you use the built-in dev-server integration below.

Requires Node `^20.19 || ^22.12 || >=24` (NestJS v12's `require(esm)` floor). The package is
**ESM-only**, but stays loadable from CommonJS via `require(esm)` since it ships no top-level `await`.

> NestJS v12 imports `reflect-metadata` itself, so you no longer need `import 'reflect-metadata'`
> at the top of your `main.ts`.

## Setup

```ts
import { MvcModule, viewBody } from 'nestjs-mvc'

@Module({
  imports: [
    MvcModule.forRoot({
      // Asset version for cache busting; version mismatch on a GET visit
      // returns 409 + X-Inertia-Location so the client does a full visit.
      version: () => myBuildHash(),
      // HTML shell for the initial page load.
      template: (page, ctx) => `<!DOCTYPE html>
<html>
<head>${ctx.assets()}</head>
<body>${viewBody(page)}</body>
</html>`,
    }),
  ],
})
export class AppModule {}
```

`MvcModule.forRootAsync({ imports, inject, useFactory })` is available for config-driven setups. The module registers itself globally, applies the protocol middleware, and binds the render interceptor.

## Single-process Vite integration

Add the `vite` option and the client dev server runs **inside your Nest process**, on the same port. No `concurrently`, no second terminal, no `localhost:5173` — `nest start --watch` stays the whole story:

```ts
MvcModule.forRoot({
  version: () => myBuildHash(),
  template,
  vite: {
    entry: 'frontend/main.tsx',   // matches build.rollupOptions.input
    root: import.meta.dirname,    // dir containing vite.config.ts (default: process.cwd())
  },
})
```

| Option | Default | Purpose |
|---|---|---|
| `entry` | — | Client entry, relative to `root`. Also the manifest key in production. |
| `root` | `process.cwd()` | Directory containing `vite.config.*`. |
| `dev` | `NODE_ENV !== 'production'` | Whether to boot the dev server. |
| `buildDir` | `'dist/client'` | Build output dir, relative to `root`. Must match `build.outDir`. |
| `base` | `'/build'` | Public URL prefix for built assets. |
| `config` | — | Extra inline Vite config, merged into the dev server config. |

What it does:

- **Development** — boots Vite with `middlewareMode` and `appType: 'custom'`, then serves its middleware from the Nest port. The HMR websocket is attached to Nest's own HTTP server, so no extra port is opened. `ctx.assets()` emits the entry script and Vite's `transformIndexHtml` injects the HMR client and plugin preambles (e.g. React Refresh) automatically.
- **Production** — no Vite involved. `ctx.assets()` reads `<root>/<buildDir>/.vite/manifest.json` and emits hashed `<script>`/`<link>` tags under `base`, walking the import graph so CSS from shared chunks is included.

Serve the built assets yourself, matching `base`:

```ts
app.useStaticAssets(join(root, 'dist/client'), { prefix: '/build/' })
```

Set `base` in `vite.config.ts` for the build so code-split chunks resolve:

```ts
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/build/' : '/',
  build: { manifest: true, outDir: 'dist/client', rollupOptions: { input: 'frontend/main.tsx' } },
}))
```

Prefer to keep Vite out of Nest? Omit the `vite` option and write your own asset tags in `template` — everything else works unchanged.

## Rendering pages

```ts
import { View, defer, optional, always, merge } from 'nestjs-mvc'

@Controller()
export class UsersController {
  @Get('users')
  @View('Users')
  index() {
    return {
      users: this.users.findAll(),                  // plain prop (may be a promise or function)
      stats: defer(() => this.stats.compute()),     // deferred: fetched right after first render
      export: optional(() => this.heavyExport()),   // only evaluated on explicit partial reload
      flash: always(this.flash.pull()),             // included even in partial reloads
      feed: merge(() => this.feed.nextPage()),      // client merges instead of replaces
    }
  }
}
```

Handlers without `@View()` are untouched — regular JSON APIs keep working next to your pages.

## Shared props & external redirects

```ts
import { ViewService } from 'nestjs-mvc'

@Controller()
export class AppController {
  constructor(private readonly inertia: ViewService) {}

  @Get('profile')
  @View('Profile')
  profile() {
    this.inertia.share('auth', { user: this.currentUser() })
    return { profile: this.profiles.mine() }
  }

  @Get('login/github')
  github() {
    // 409 + X-Inertia-Location during Inertia visits, regular redirect otherwise
    this.inertia.location('https://github.com/login/oauth/authorize?...')
  }
}
```

`ViewService` is request-scoped; sharing from middleware/guards via the request state is also supported.

## Validation errors

Invalid form submissions follow the redirect-back flow Inertia's form helpers expect: the module registers an exception filter that catches validation failures on Inertia visits, flashes the field errors to a short-lived cookie, and redirects back. The next render shares them as the `errors` prop (always present, `{}` when clean) — so `useForm().errors` just works, no session middleware required.

Wire `ValidationPipe` up with the provided `exceptionFactory` to get errors keyed by field (including nested `parent.child` paths):

```ts
import { ValidationPipe } from '@nestjs/common'
import { validationExceptionFactory } from 'nestjs-mvc'

app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
```

> Building without `emitDecoratorMetadata` (tsx, esbuild, SWC without the transform)? Pass the DTO explicitly: `@Body(new ValidationPipe({ expectedType: CreateUserDto, exceptionFactory: validationExceptionFactory }))`.

You can also throw errors yourself, e.g. from a service:

```ts
import { ValidationException } from 'nestjs-mvc'

throw new ValidationException({ email: 'That email is already taken.' })
```

The `X-Inertia-Error-Bag` header is honoured: errors are scoped under the bag name the client asked for. A plain `ValidationPipe` without the factory works too — the filter falls back to parsing the default message array. Non-Inertia requests are untouched and keep NestJS's regular 400 JSON response (with an added `errors` object when you use the factory).

## Protocol behaviour handled for you

- `X-Inertia` requests get the JSON page object; first loads get your HTML shell with `data-page`.
- Partial reloads (`X-Inertia-Partial-Data` / `-Except` / `-Component`) resolve only the requested props.
- `defer()` props are advertised via `deferredProps` (grouped), `merge()` props via `mergeProps` (honouring `X-Inertia-Reset`).
- Validation failures → redirect back with the `errors` prop (with `X-Inertia-Error-Bag` support).
- 302 → 303 conversion for `PUT`/`PATCH`/`DELETE` redirects.
- Stale asset version on GET visits → `409` + `X-Inertia-Location`.
- `Vary: X-Inertia` on every page response.
- Optional single-process Vite dev server (middleware mode, HMR on the app port).
