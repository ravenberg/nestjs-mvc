---
title: Data on every page
---

Some data belongs on every page: the app name, the logged in user, the number of unread messages. Share it once instead of returning it from every controller. {% .lead %}

## Share from a middleware

A middleware runs for every request, so it is a good place for data that every page needs:

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

Shared data is part of the page props, so any component can read it with `usePage()`. A layout is the usual place:

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

## Data that needs the database

Pass a function instead of a value. It runs when the page renders, and only then:

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

This also matters for the logged in user. Middleware runs before your guards, so `req.user` is not set yet when the middleware itself runs. A function runs later, after the guards.

## The logged in user

For the user you do not need a middleware. Tell nestjs-mvc which fields to share, and it adds `auth.user` to every page. See [Authentication](/docs/authentication).

```ts
MvcModule.forRoot({
  vite: {},
  auth: { share: (user: User) => ({ id: user.id, name: user.name }) },
})
```

## Share from a single request

Inside a handler, guard or interceptor, use `ViewService.share()`. It adds data for this request only:

```ts
@Get()
@View('Dashboard')
dashboard() {
  this.view.share('locale', 'en-GB')
  return { stats: this.stats.today() }
}
```
