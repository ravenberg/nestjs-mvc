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

Precedence, `always()` and the `sharedProps` field are covered in the [reference](/docs/shared-props).
