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
import { View, defer, optional, always, merge, scroll, once } from 'nestjs-mvc'

@Controller()
export class UsersController {
  @Get('users')
  @View('Users')
  index(@Query('page') page?: string) {
    return {
      users: scroll(() => this.users.page(page)),   // infinite scroll: see below
      stats: defer(() => this.stats.compute()),     // deferred: fetched right after first render
      export: optional(() => this.heavyExport()),   // only evaluated on explicit partial reload
      flash: always(this.flash.pull()),             // included even in partial reloads
      feed: merge(() => this.feed.nextPage()),      // client merges instead of replaces
      countries: once(() => this.countries.all()),  // resolved once, remembered by the client
    }
  }
}
```

Handlers without `@View()` are untouched — regular JSON APIs keep working next to your pages.

### Infinite scroll

`scroll()` wraps a paginated list for Inertia's `<InfiniteScroll data="users">`
component. The closure returns the rows under `data` plus the cursor the client
needs, and anything else you like:

```ts
users: scroll(async () => ({
  data: rows,                 // the array the client appends to (or prepends)
  currentPage: 2,             // numbers for offset paging, strings for cursors
  previousPage: 1,
  nextPage: 3,                // null when there is no more
  pageName: 'page',           // the query parameter the client sends; defaults to `page`
  total: 120,                 // extra fields travel to the client untouched
}))
```

The adapter labels `users.data` for merging, emits the cursor under
`scrollProps`, and honours the client's `X-Inertia-Infinite-Scroll-Merge-Intent`
header, so scrolling up prepends and scrolling down appends. A visit that resets
the prop (`router.reload({ reset: ['users'] })`, typically when a filter changes)
gets page one back unlabelled with `scrollProps.users.reset = true`, and the
client starts over.

Options: `{ wrapper: 'items' }` for a differently named array, `{ defer: true }`
(or a group name) to load the first page in the client's follow-up request like
`defer()` does, and `{ metadata: (value) => ({ pageName, currentPage, … }) }` to
read the cursor off your own paginator shape. There is no ORM binding in the
adapter; the demo ships an offset and a keyset paginator over TypeORM in
`apps/demo/src/pagination.ts` as a starting point.

### Once props

`once()` is for reference data that is expensive or large but rarely changes: a
country list, the user's permissions, feature flags. It is resolved on the first
visit and then **remembered by the client** across visits. Every later request
carries `X-Inertia-Except-Once-Props` with the keys the client holds; for those
the closure is not called and the prop is left out, and the client fills its copy
back in before rendering.

```ts
countries: once(() => this.countries.all(), {
  as: 'countries',   // cache key shared by every page that uses it; defaults to the prop path
  until: 3600,       // seconds (or a Date); omit to keep it until a full page load
  fresh: changed,    // re-resolve and resend even if the client says it has it
})
```

An explicit partial reload that names the prop always re-resolves it. Nothing is
cached on the server: the adapter only reads this request's header, so one
process serving many users cannot leak one user's data into another's response.
That is also why a `once()` instance is safe to hoist out of a handler — it is an
immutable description, never a memo.

After a mutation, tell the client its copy is stale from the handler that changed
the data — the GET does not change:

```ts
@Post('countries')
async store(@Body() dto: CreateCountryDto) {
  await this.countries.save(dto)
  return this.view.refresh('countries').back()
}
```

## Shared props, redirects & flash

```ts
import { ViewService } from 'nestjs-mvc'

@Controller()
export class AppController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('profile')
  @View('Profile')
  profile() {
    this.view.share('auth', { user: this.currentUser() })
    return { profile: this.profiles.mine() }
  }

  @Post('profile')
  async update(@Body() dto: UpdateProfileDto) {
    await this.profiles.update(dto)
    return this.view.flash('message', 'Profile saved.').back()   // or .redirect('/profile')
  }

  @Get('login/github')
  github() {
    // 409 + X-Inertia-Location during Inertia visits, a regular redirect otherwise
    return this.view.location('https://github.com/login/oauth/authorize?...')
  }
}
```

`ViewService` is request-scoped. `redirect()`, `back()` and `location()` end the
request (nothing after them runs) and answer through Nest's HTTP adapter, so they
work on Express and Fastify alike; `redirect()` uses 303 after PUT/PATCH/DELETE,
as the protocol requires. Sharing from middleware works through
`requestState(req).shared`.

### Flash

`flash(key, value)` puts data in the page object's `flash` field for the next
render — the one after a redirect, or this request's own — and then it is gone.
Read it on the client with `usePage().flash` or the `flash` event. Together with
`refresh(key)` for [once props](#once-props) it is the mutation side of the
model: change data, leave a message, mark what the client must reload, redirect.

Nothing is kept on the server. Flash data, validation errors and refresh keys
travel in one bag that the client carries in an `HttpOnly`, `SameSite=Lax`
cookie (`mvc_flash`), consumed by the next render. A redirect chain or a 409 in
between leaves it untouched. Apps that already run `express-session` or
`@fastify/session` can keep the bag in the session instead:

```ts
MvcModule.forRoot({ flash: { store: SessionFlashStore } })
```

The store is the `MVC_FLASH_STORE` provider behind a three-method `FlashStore`
interface, so you can bring your own.

### Platform support

The adapter uses Nest's HTTP adapter and the raw Node request and response, not
Express APIs: page rendering, redirects, validation errors and flash are tested on
**Express and Fastify**. Two conveniences remain Express-only: calling
`res.redirect()` yourself (it is patched to send 303 and carry flash data) and the
in-process Vite dev server. On Fastify, use `ViewService.redirect()` and build the
client separately for now.

## Validation errors

Invalid form submissions follow the redirect-back flow Inertia's form helpers expect: the module registers an exception filter that catches validation failures on Inertia visits, flashes the field errors to a short-lived cookie, and redirects back. The next render shares them as the `errors` prop (always present, `{}` when clean) — so `useForm().errors` just works, no session middleware required.

Wire `ValidationPipe` up with the provided `exceptionFactory` to get errors keyed by field (including nested `parent.child` paths):

```ts
import { ValidationPipe } from '@nestjs/common'
import { validationExceptionFactory } from 'nestjs-mvc'

app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
```

> Building without `emitDecoratorMetadata` (tsx, esbuild, SWC without the transform)? Either pass the DTO explicitly — `@Body(new ValidationPipe({ expectedType: CreateUserDto, exceptionFactory: validationExceptionFactory }))` — or skip DTO classes altogether with a schema, below.

**Standard Schema (Zod, Valibot, ArkType).** NestJS v12 validates `@Body({ schema })` with `StandardSchemaValidationPipe`, no decorator metadata needed. Pair it with the matching factory and nested paths arrive as the dot keys Inertia's form helpers expect:

```ts
app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))

@Post('contacts')
store(@Body({ schema: CreateContactSchema }) body: CreateContact) { ... }
// invalid → redirect back with errors like { 'user.email': 'Invalid email', 'tags.0': 'Empty tag' }
```

Issues without a path are keyed `_form`. Without the factory the filter still parses the pipe's default `"user.email: Invalid email"` messages, and `ValidationPipe({ errorFormat: 'grouped' })` is understood too.

### Live validation (Precognition)

Inertia v3's `useForm` can validate a field the moment the user leaves it, against the **same** endpoint and the **same** rules as the real submission — no second endpoint. Nothing to configure on the server: a request carrying `Precognition: true` runs the handler's pipes (global, `@UsePipes()`, and the parameter's own) and stops before the handler.

```tsx
const form = useForm('post', '/contacts', { user: { name: '', email: '' } })
<input onBlur={() => form.validate('user.email')} />   // 204 when fine, 422 + errors when not
```

| Request | Response |
|---|---|
| `Precognition: true` | `Precognition: true`, plus `204` + `Precognition-Success: true` or `422` + `{ errors }` |
| `Precognition-Validate-Only: user.email` | errors narrowed to that field (nested paths included) |
| any request to the route | `Vary: Precognition` |

The same pipes run, so a pipe with side effects runs too; a pipe failure that carries no field errors (a `ParseIntPipe` on a route param, say) surfaces as the usual 400.

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
- `scroll()` props label their `data` array in `mergeProps` or `prependProps` (per `X-Inertia-Infinite-Scroll-Merge-Intent`) and carry their cursor in `scrollProps`; a reset drops the label and sets `reset: true`.
- `once()` props are described in `onceProps` (`{ prop, expiresAt }`) and skipped when their key is in `X-Inertia-Except-Once-Props`, unless `fresh`, marked by `refresh()`, or explicitly requested.
- Flash data → the page object's `flash` field, once, carried across redirects and 409s in the same client-held bag as validation errors.
- Validation failures → redirect back with the `errors` prop (with `X-Inertia-Error-Bag` support).
- 302 → 303 conversion for `PUT`/`PATCH`/`DELETE` redirects.
- Stale asset version on GET visits → `409` + `X-Inertia-Location`.
- `Vary: X-Inertia` on every page response.
- SSR per route via `@Ssr()`, off by default; Inertia visits are never server-rendered.
- Optional single-process Vite dev server (middleware mode, HMR on the app port), with generated entries via `nestjs-mvc/vite`.
