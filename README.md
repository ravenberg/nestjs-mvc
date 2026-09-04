# nestjs-mvc

A modern, idiomatic [Inertia.js](https://inertiajs.com) adapter for [NestJS](https://nestjs.com) — build server-driven single-page apps (React, Vue, Svelte) on a NestJS monolith.

> ⚠️ Work in progress, not yet published to npm.

## Why

The existing NestJS adapters for Inertia are unmaintained and only speak the v1 protocol. This project targets the modern Inertia protocol and the modern NestJS ecosystem:

- **Idiomatic NestJS** — an `@View('Component')` decorator on your handler; return props as a plain object. No `res.inertia.render()` plumbing.
- **One process, one port** — an opt-in `vite` option boots the Vite dev server *inside* your Nest process (middleware mode, HMR on the app port). `nest start --watch` stays the whole dev story: no `concurrently`, no second terminal, no `localhost:5173`. In production Vite is gone and asset tags come from the build manifest.
- **Inertia v2+ protocol** — partial reloads, deferred props (`defer()`), lazy props (`optional()`), `always()`, merge props (`merge()` + `X-Inertia-Reset`), asset versioning with 409 full-visit responses, 303 redirects for PUT/PATCH/DELETE.
- **Laravel-style validation errors** — a built-in exception filter turns `ValidationPipe` failures into the redirect-back + `errors` prop flow (`useForm().errors` just works), with `X-Inertia-Error-Bag` support and no session middleware required.
- **ESM-first and v12-native** — ESM-only, built for the ESM-only NestJS v12 (`peerDependencies: ^12`), and still `require()`-able from CommonJS apps via Node's `require(esm)`.
- **Tested against the protocol** — the test suite asserts the actual wire format (headers, page object, status codes).

## Quick look

```ts
// app.module.ts
MvcModule.forRoot({
  version: 'my-build-hash',
  template: (page, ctx) => `<!DOCTYPE html>...${ctx.assets()}...${viewBody(page)}...`,
  vite: { entry: 'frontend/main.tsx' },          // dev server runs in this process
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
- [ ] Inertia v3 protocol (script-tag page object, nested props, scroll/once/flash metadata)
- [ ] SSR
- [ ] Standard Schema validation support
- [ ] History encryption / `clearHistory` helpers
- [ ] Fastify support
- [ ] Starter templates (React / Vue / Svelte)

## License

MIT
