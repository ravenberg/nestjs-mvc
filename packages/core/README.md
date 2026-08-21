# @nestjs-inertia/core

Modern [Inertia.js](https://inertiajs.com) adapter for NestJS (Express platform). See the [repository README](../../README.md) for the project overview.

## Install

```sh
pnpm add @nestjs-inertia/core
```

Peer dependencies: `@nestjs/common` and `@nestjs/core` `^11 || ^12`, `rxjs ^7.8`.

## Setup

```ts
import { InertiaModule, inertiaBody } from '@nestjs-inertia/core'

@Module({
  imports: [
    InertiaModule.forRoot({
      // Asset version for cache busting; version mismatch on a GET visit
      // returns 409 + X-Inertia-Location so the client does a full visit.
      version: () => myBuildHash(),
      // HTML shell for the initial page load.
      template: (page) => `<!DOCTYPE html>
<html>
<head><script type="module" src="/build/main.js"></script></head>
<body>${inertiaBody(page)}</body>
</html>`,
    }),
  ],
})
export class AppModule {}
```

`InertiaModule.forRootAsync({ imports, inject, useFactory })` is available for config-driven setups. The module registers itself globally, applies the protocol middleware, and binds the render interceptor.

## Rendering pages

```ts
import { Inertia, defer, optional, always, merge } from '@nestjs-inertia/core'

@Controller()
export class UsersController {
  @Get('users')
  @Inertia('Users')
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

Handlers without `@Inertia()` are untouched — regular JSON APIs keep working next to your pages.

## Shared props & external redirects

```ts
import { InertiaService } from '@nestjs-inertia/core'

@Controller()
export class AppController {
  constructor(private readonly inertia: InertiaService) {}

  @Get('profile')
  @Inertia('Profile')
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

`InertiaService` is request-scoped; sharing from middleware/guards via the request state is also supported.

## Protocol behaviour handled for you

- `X-Inertia` requests get the JSON page object; first loads get your HTML shell with `data-page`.
- Partial reloads (`X-Inertia-Partial-Data` / `-Except` / `-Component`) resolve only the requested props.
- `defer()` props are advertised via `deferredProps` (grouped), `merge()` props via `mergeProps` (honouring `X-Inertia-Reset`).
- 302 → 303 conversion for `PUT`/`PATCH`/`DELETE` redirects.
- Stale asset version on GET visits → `409` + `X-Inertia-Location`.
- `Vary: X-Inertia` on every page response.
