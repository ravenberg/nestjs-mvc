# nestjs-mvc

A modern, idiomatic [Inertia.js](https://inertiajs.com) adapter for [NestJS](https://nestjs.com) — build server-driven single-page apps (React, Vue, Svelte) on a NestJS monolith.

> ⚠️ Work in progress, not yet published to npm.

## Why

The existing NestJS adapters for Inertia are unmaintained and only speak the v1 protocol. This project targets the modern Inertia protocol and the modern NestJS ecosystem:

- **SSR only where you ask for it** — a client-rendered app that feels multi-page, with `@Ssr()` on the one landing page or blog controller that needs to be indexable. It renders **in the same process** in development and production — no sidecar SSR server — and falls back to client rendering when it fails.
- **Idiomatic NestJS** — an `@View('Component')` decorator on your handler; return props as a plain object. No `res.inertia.render()` plumbing.
- **One process, one port** — an opt-in `vite` option boots the Vite dev server *inside* your Nest process (middleware mode, HMR on the app port). `nest start --watch` stays the whole dev story: no `concurrently`, no second terminal, no `localhost:5173`. In production Vite is gone and asset tags come from the build manifest.
- **No entry files** — `nestjsMvc()` from `nestjs-mvc/vite` generates the client and SSR entries: the page a route renders *is* the entry point. One `vite build` produces both bundles, and stylesheets are real `<link>` tags in development too.
- **Inertia v3 protocol** — partial reloads with dot-notation, deferred props (`defer()`, with `rescue` for ones that may fail), lazy props (`optional()`), `always()`, merge props (`merge()`, `prepend()`, `deepMerge()`, `matchOn`, `X-Inertia-Reset`), infinite scroll (`scroll()` with append/prepend and reset), once props (`once()` with `as`/`until`/`fresh`, remembered by the client), precognition, asset versioning with 409 full-visit responses, 303 redirects for PUT/PATCH/DELETE.
- **Your own error pages** — `errorPages: ({ status }) => ({ component: 'Errors/Show', props: { status } })` renders a page with the error's status for the codes you choose, on first load and Inertia visits alike; the rest stays Nest's default.
- **Live validation for free** — Inertia's `form.validate('email')` hits the same handler with `Precognition: true`; the adapter runs the same pipes and answers `204` or `422` without running the handler. One set of rules, no validation endpoint.
- **Laravel-style validation errors and flash, no session required** — a built-in exception filter turns `ValidationPipe` failures into the redirect-back + `errors` prop flow (`useForm().errors` just works), and `view.flash()` / `view.refresh()` ride the same client-held bag. Bring a session if you have one; the server stays stateless if you don't.
- **Platform-agnostic like Nest itself** — rendering, redirects, errors and flash go through Nest's HTTP adapter and the raw Node request, and are tested on Express and Fastify.
- **ESM-first and v12-native** — ESM-only, built for the ESM-only NestJS v12 (`peerDependencies: ^12`), and still `require()`-able from CommonJS apps via Node's `require(esm)`.
- **Tested against the protocol** — the test suite asserts the actual wire format (headers, page object, status codes).

## Quick look

```ts
// vite.config.ts
export default defineConfig({ plugins: [react(), nestjsMvc()] })   // entries are generated

// app.module.ts
MvcModule.forRoot({
  version: 'my-build-hash',
  template: (page, ctx) => `<!DOCTYPE html>...${ctx.assets()}...${viewBody(page)}...`,
  vite: {},                                      // dev server runs in this process
})

// app.controller.ts
@Get('users')
@View('Users')
users() {
  return {
    filters: this.filters,                       // regular prop
    users: defer(() => this.users.findAll()),    // fetched right after first render
    token: optional(() => this.expensive()),     // only on explicit partial reload
    flash: always(this.flash.pull()),            // included in every response
    feed: merge(() => this.feed.nextPage()),     // client merges instead of replaces
  }
}
```

## Repository layout

- [`packages/core`](packages/core) — the adapter (`nestjs-mvc`)
- [`apps/demo`](apps/demo) — NestJS + React + Vite demo app

## Development

```sh
pnpm install
pnpm test          # protocol tests (Vitest 4 + supertest)
pnpm build         # build the core package (tsdown/Rolldown, ESM + CJS + d.ts)
pnpm lint          # oxlint
pnpm dev           # run the demo: single Nest process on :3000 (Vite included)
```

## Roadmap

- [x] Validation exception filter → Inertia error-bag flow (Laravel-style)
- [x] Single-process Vite dev server (middleware mode, HMR on the app port)
- [x] NestJS v12 baseline (ESM-only, `peerDependencies: ^12`)
- [x] Inertia v3 protocol: script-tag page object, nested props with dot paths, infinite scroll, once props, flash, precognition, error pages, merge variants, deferred rescue, history encryption, fragment redirects, shared-props metadata (validation polish and prefetch awareness still to come)
- [x] Opt-in SSR via `@Ssr()`, rendered in-process in dev *and* production
- [x] Standard Schema validation (`@Body({ schema })` with Zod/Valibot/ArkType, errors keyed by dot path)
- [x] History encryption (`@EncryptHistory()`, `history.encrypt`) and `clearHistory()` on logout
- [ ] Fastify support — rendering, redirects, errors and flash already run on Fastify; the in-process Vite dev server does not yet
- [ ] Starter templates (React / Vue / Svelte)

## License

MIT
