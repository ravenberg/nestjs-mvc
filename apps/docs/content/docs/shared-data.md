---
title: Data on every page
---

Some data belongs on every page, like the app name or the number of unread messages. You can share it once instead of returning it from every controller. {% .lead %}

## Share from a middleware

Middleware runs on every request, which makes it a good place for data every page needs:

```ts
// src/shared-data.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common'
import { requestState, type AnyRequest } from 'nestjs-mvc'

@Injectable()
export class SharedDataMiddleware implements NestMiddleware {
  use(req: AnyRequest, res: unknown, next: () => void) {
    requestState(req).shared.appName = 'Acme CRM'
    next()
  }
}
```

```ts
// src/app.module.ts
@Module({ imports: [MvcModule.forRoot({ vite: {} })] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SharedDataMiddleware).forRoutes('{*path}')
  }
}
```

Every page now gets an `appName` prop.

## Read it anywhere

Shared data ends up in the page props, so any component can read it with `usePage()`. Usually that's your layout:

{% framework-code %}
```tsx
import { usePage } from 'nestjs-mvc/react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { props } = usePage<{ appName: string }>()

  return (
    <>
      <header>{props.appName}</header>
      <main>{children}</main>
    </>
  )
}
```

```vue
<!-- frontend/layouts/AppLayout.vue -->
<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'

const page = usePage<{ appName: string }>()
</script>

<template>
  <header>{{ page.props.appName }}</header>
  <main>
    <slot />
  </main>
</template>
```
{% /framework-code %}

## Data that needs the database

Pass a function instead of a value, and it only runs when a page actually renders:

```ts
@Injectable()
export class SharedDataMiddleware implements NestMiddleware {
  constructor(private readonly messages: MessagesService) {}

  use(req: AnyRequest, res: unknown, next: () => void) {
    requestState(req).shared.unread = () => this.messages.countUnread()
    next()
  }
}
```

This matters for the logged in user as well. Middleware runs before your guards, so `req.user` isn't set yet at that point, but a function runs later, after the guards are done.

## The logged in user

For the user you can skip the middleware. Tell nestjs-mvc which fields to share and it adds `auth.user` to every page. [Authentication](/docs/authentication) has the details.

```ts
MvcModule.forRoot({
  vite: {},
  auth: { share: (user: User) => ({ id: user.id, name: user.name }) },
})
```

## Share from a single request

Inside a handler, guard or interceptor you can use `ViewService.share()`, which adds data for the current request only:

```ts
@Get()
@View('Dashboard')
dashboard() {
  this.view.share('locale', 'en-GB')
  return { stats: this.stats.today() }
}
```

## In detail

### When a page returns the same name

A page's props are put together in this order, and a later key replaces an earlier one:

1. `errors`, the validation errors from the previous request
2. your shared data, with `auth.user` added
3. what the handler returns

So a handler that returns `title: 'Dashboard'` wins over a shared `title`. The replacement is shallow: if a handler returns its own `auth`, the shared `auth` (and the user in it) is gone for that page. And don't share a key called `errors`, because it replaces the validation errors.

### Your own auth object

If you share an `auth` object yourself, the user is added to it:

```ts
requestState(req).shared.auth = { can: { invite: true } }
// the page gets: auth: { can: { invite: true }, user: { id: 1, name: 'Ada' } }
```

When nobody is logged in, `auth.user` is `null`, and so it is when `share` returns nothing. `share` also gets the request as its second argument, and it may be `async`. Whatever it returns ends up in the HTML source of every first load, so pick the fields the page needs and never return the whole user record.

Without `auth.share` nothing about the user is shared. In development you get a warning when `req.user` is set but never reaches the page.

### Data that must stay fresh

When the page reloads a few props, say `router.reload({ only: ['stats'] })`, your shared data is left out too, and its functions aren't called. The page keeps the value it had, which is what you want for the app name or the user.

For something that should be up to date after every request, like the unread count, wrap it in `always()`. It then comes along with every response, even a reload that asks for something else:

```ts
import { always, requestState } from 'nestjs-mvc'

requestState(req).shared.unread = always(() => this.messages.countUnread())
```

Use it on a top level key. An `always()` inside an object is only sent when that object itself is part of the response. And since its function runs on every request to the page (each deferred prop, each poll tick), keep it cheap.

### Other helpers work here too

Shared data is resolved the same way as the props a handler returns. Functions are called at any depth, and `defer()`, `optional()` and `once()` work as well. A list of countries every form needs is a good fit for [`once()`](/docs/once): the browser keeps it across pages.

### Error pages

A page you return from `errorPages` only gets your shared data when it sets `shared: true`. See [Error pages](/docs/error-pages).
