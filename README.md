# inertia-nest

A modern, idiomatic [Inertia.js](https://inertiajs.com) adapter for [NestJS](https://nestjs.com) — build server-driven single-page apps (React, Vue, Svelte) on a NestJS monolith.

> ⚠️ Work in progress, not yet published to npm.

## Why

The existing NestJS adapters for Inertia are unmaintained and only speak the v1 protocol. This project targets the modern Inertia protocol and the modern NestJS ecosystem:

- **Idiomatic NestJS** — an `@Inertia('Component')` decorator on your handler; return props as a plain object. No `res.inertia.render()` plumbing.
- **Inertia v2+ protocol** — partial reloads, deferred props (`defer()`), lazy props (`optional()`), `always()`, merge props (`merge()` + `X-Inertia-Reset`), asset versioning with 409 full-visit responses, 303 redirects for PUT/PATCH/DELETE.
- **Laravel-style validation errors** — a built-in exception filter turns `ValidationPipe` failures into the redirect-back + `errors` prop flow (`useForm().errors` just works), with `X-Inertia-Error-Bag` support and no session middleware required.
- **ESM-first, dual-published** — works on NestJS v11 today and is ready for the ESM-only NestJS v12 (`peerDependencies: ^11 || ^12`).
- **Tested against the protocol** — the test suite asserts the actual wire format (headers, page object, status codes).

## Quick look

```ts
// app.module.ts
InertiaModule.forRoot({
  version: 'my-build-hash',
  template: (page) => `<!DOCTYPE html>...${inertiaBody(page)}...`,
})

// app.controller.ts
@Get('users')
@Inertia('Users')
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

- [`packages/core`](packages/core) — the adapter (`inertia-nest`)
- [`apps/demo`](apps/demo) — NestJS + React + Vite demo app

## Development

```sh
pnpm install
pnpm test          # protocol tests (Vitest 4 + supertest)
pnpm build         # build the core package (tsdown/Rolldown, ESM + CJS + d.ts)
pnpm lint          # oxlint
pnpm dev           # run the demo: Nest on :3000, Vite 8 dev server on :5173
```

## Roadmap

- [x] Validation exception filter → Inertia error-bag flow (Laravel-style)
- [ ] Fastify support
- [ ] SSR
- [ ] History encryption / `clearHistory` helpers
- [ ] Standard Schema integration (NestJS v12)
- [ ] CI matrix against NestJS v11 + v12 previews
- [ ] Starter templates (React / Vue / Svelte)

## License

MIT
