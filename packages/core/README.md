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

Two lines, and the client dev server runs **inside your Nest process**, on the
same port. No `concurrently`, no second terminal, no `localhost:5173` —
`nest start --watch` stays the whole story:

```ts
// vite.config.ts
import { nestjsMvc } from 'nestjs-mvc/vite'
export default defineConfig({ plugins: [react(), nestjsMvc()] })

// app.module.ts
MvcModule.forRoot({ version: () => myBuildHash(), template, vite: {} })
```

There is no `main.tsx` and no SSR entry to write: **the page a route renders is
the entry point.** `nestjsMvc()` generates both entries, resolves `@View('Users/Index')`
to `frontend/pages/Users/Index.tsx`, and makes one `vite build` produce the client
bundle (`dist/client`, with a manifest) and the SSR bundle (`dist/ssr/ssr.js`).
Stylesheets are entries of their own, linked as `<link rel="stylesheet">` in
development *and* production, so a server-rendered page never flashes unstyled.

Plugin options:

| Option | Default | Purpose |
|---|---|---|
| `pages` | `'frontend/pages'` | Directory holding the page components. |
| `css` | `'frontend/app.css'` if it exists | Stylesheet(s) to link; `false` links nothing. |
| `framework` | detected from `package.json` | `'react'` for now; Vue and Svelte follow. |

Module options (`vite`):

| Option | Default | Purpose |
|---|---|---|
| `root` | `process.cwd()` | Directory containing `vite.config.*`. Pass an absolute path if the process may start elsewhere. |
| `dev` | `NODE_ENV !== 'production'` | Whether to boot the dev server. |
| `buildDir` | `'dist/client'` | Build output dir, relative to `root`. |
| `base` | `'/build'` | Public URL prefix for built assets. |
| `entry` | generated | Bring your own client entry (see Advanced). |
| `config` | — | Extra inline Vite config, merged into the dev server config. |

What it does:

- **Development** — boots Vite with `middlewareMode` and `appType: 'custom'`, then serves its middleware from the Nest port. The HMR websocket is attached to Nest's own HTTP server, so no extra port is opened. `ctx.assets()` emits the stylesheet links and the entry script; Vite's `transformIndexHtml` injects the HMR client and plugin preambles (e.g. React Refresh).
- **Production** — no Vite involved. `ctx.assets()` reads `<root>/<buildDir>/.vite/manifest.json` and emits hashed `<link>`/`<script>` tags under `base`, walking the import graph so CSS from shared chunks is included.

Serve the built assets yourself, matching `base`:

```ts
app.useStaticAssets(join(root, 'dist/client'), { prefix: '/build/' })
```

### Advanced: bring your own entry

Set `vite.entry` and the plugin's generated client entry is ignored — you write
`main.tsx` yourself and configure the build:

```ts
vite: { entry: 'frontend/main.tsx' }          // matches build.rollupOptions.input
```

```ts
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/build/' : '/',
  build: { manifest: true, outDir: 'dist/client', rollupOptions: { input: 'frontend/main.tsx' } },
}))
```

Prefer to keep Vite out of Nest? Omit the `vite` option and write your own asset
tags in `template` — everything else works unchanged.

## Server-side rendering

SSR is opt-in per route and off everywhere else. The app you build with
`nestjs-mvc` is a client-rendered SPA that feels like a multi-page app; SSR is for
the few pages that need to be indexable — a landing page, a blog — and nothing
more. Put `@Ssr()` on the handler:

```ts
@Get()
@View('Home')
@Ssr()
home() { ... }
```

On a controller it covers every handler, and a handler can opt back out:

```ts
@Controller('blog')
@Ssr()
export class BlogController {
  @Get()        @View('Blog/Index')  index()  { ... }   // server-rendered
  @Get('drafts') @View('Blog/Drafts') @Ssr(false) drafts() { ... }
}
```

A guard or service can override the decorator for one request through
`ViewService`, for example once you know the visitor is logged in:

```ts
this.view.disableSsr()   // or enableSsr()
```

Runtime call → decorator on the handler → decorator on the controller → off.
Inertia visits are never server-rendered; only the initial HTML load is.

That is all the configuration there is. With `nestjsMvc()` in your Vite config the
SSR entry is generated, `vite build` writes `dist/ssr/ssr.js`, and the adapter
finds both by convention.

**One process, in development and production.** In development the generated
entry runs in-process through Vite, so edits apply immediately. In production the
built bundle is `import()`ed into the same process. Inertia's reference adapter
posts to a separate Node SSR server only because PHP cannot execute JavaScript —
NestJS already runs on Node, so that hop buys nothing.

Your template receives the two SSR slots:

```ts
template: (page, ctx) => `<!DOCTYPE html>
<html>
<head>${ctx.assets()}${ctx.head()}</head>
<body>${ctx.body()}</body>
</html>`
```

`ctx.body()` returns the server-rendered markup when SSR ran, and falls back to
the root element plus page-object script otherwise, so one template covers both.

### Advanced

Bring your own SSR entry, or put the bundle elsewhere:

```ts
ssr: {
  entry: 'frontend/ssr.tsx',   // dev, executed in-process through Vite
  bundle: 'dist/ssr/ssr.js',   // production, imported in-process
}
```

The entry default-exports a function that takes the page object and returns
`{ head, body }`; build it with `vite build --ssr frontend/ssr.tsx --outDir dist/ssr`.

If you *do* want rendering on its own service — to scale or isolate it — set
`url` and the adapter posts to a standalone Inertia SSR server instead. It is an
explicit opt-in, never a default:

```ts
ssr: { url: 'http://127.0.0.1:13714', timeout: 5000 }
```

**Failures are never fatal.** A render that throws, times out, or cannot reach the
SSR server is reported through `onError` (or logged) and the response falls back
to client-side rendering, so a broken SSR build never takes the site down. Errors
are classified as `browser-api`, `component-resolution`, `render` or `connection`.
A route that opts in before the bundle is built is reported the same way, naming
the component and the path it looked at.

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

- `X-Inertia` requests get the JSON page object; first loads get your HTML shell with the page object in a `<script type="application/json">` element.
- Partial reloads (`X-Inertia-Partial-Data` / `-Except` / `-Component`) resolve only the requested props, using **dot-notation** for nested ones (`only: ['auth.notifications']`).
- `optional()`, `defer()` and `merge()` are recognised at any depth — inside plain objects, arrays and the return values of closures — and all metadata is emitted as dot paths. A closure guarding an unrequested branch is never called.
- `defer()` props are advertised via `deferredProps` (grouped), `merge()` props via `mergeProps` (honouring `X-Inertia-Reset`).
- Validation failures → redirect back with the `errors` prop (with `X-Inertia-Error-Bag` support).
- 302 → 303 conversion for `PUT`/`PATCH`/`DELETE` redirects.
- Stale asset version on GET visits → `409` + `X-Inertia-Location`.
- `Vary: X-Inertia` on every page response.
- SSR per route via `@Ssr()`, off by default; Inertia visits are never server-rendered.
- Optional single-process Vite dev server (middleware mode, HMR on the app port), with generated entries via `nestjs-mvc/vite`.
