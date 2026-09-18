---
title: Shared props
---

Shared props are props every page of a request gets without its handler returning them: the logged in user, the app name, a count of unread messages. {% .lead %}

## Usage

There are three ways in, and they all end up in the same place:

```ts
// 1. From a middleware (or anything with the request)
import { requestState } from 'nestjs-mvc'
requestState(req).shared.appName = 'Acme CRM'

// 2. From a guard, interceptor or handler that injects ViewService
this.view.share('locale', 'en-GB')
this.view.share({ locale: 'en-GB', timezone: 'Europe/Amsterdam' })

// 3. The logged in user, from the module options
MvcModule.forRoot({
  vite: {},
  auth: { share: (user: User) => ({ id: user.id, name: user.name }) },
})
```

| API | Type | Meaning |
| --- | --- | --- |
| `requestState(req).shared` | `Record<string, unknown>` | This request's shared props. Works with the raw request, the Express request or the Fastify request. |
| `ViewService.share(key, value)` | `this` | Sets one key. |
| `ViewService.share(props)` | `this` | Copies the keys of `props` in (a shallow `Object.assign`). |
| `ViewService.getShared()` | `Record<string, unknown>` | The same object as `requestState(req).shared`. |
| `auth.share(user, request)` | `unknown` | What the page sees as `auth.user`. May be `async`. |
| `exposeSharedProps` | `boolean`, default `true` | Whether the page object lists the shared keys in `sharedProps`. |

Shared props belong to one request. Nothing is kept between requests, so every request starts with an empty object and your middleware fills it again.

## Sharing from a middleware

A middleware runs on every route, so it's the usual home for app wide data:

```ts
@Injectable()
export class SharedDataMiddleware implements NestMiddleware {
  constructor(private readonly messages: MessagesService) {}

  use(req: AnyRequest, res: unknown, next: () => void) {
    requestState(req).shared.appName = 'Acme CRM'
    requestState(req).shared.unread = () => this.messages.countUnread(req)
    next()
  }
}
```

The order of middleware doesn't matter: `requestState()` creates the state the first time anything asks for it.

## Closures

A shared value can be a function. It's called when the page renders, which is after your guards ran, and only if the prop is sent at all. That makes it the way to share anything that depends on `req.user`: a middleware runs before the guards, so `req.user` isn't set yet when the middleware itself runs, but it is by the time the function is called.

Shared props go through the same resolution as the props a handler returns. Functions are called at any depth, nested objects are walked, and helpers like [`defer()`](/docs/defer), [`optional()`](/docs/optional), [`once()`](/docs/once-props) and [`always()`](/docs/always) work in shared data too. See [@View()](/docs/view) for the rules.

## The auth.user prop

With `auth.share` set, every page gets `auth.user`:

* the value `share(user, request)` returns, when a user is logged in (or `null`, if it returns `null` or `undefined`);
* `null`, when nobody is logged in.

The user is read from `request.user` (where guards and Passport put it), or from your `auth.user(request)` option. It's read at render time, after the guards.

If you also share an `auth` object yourself, `user` is added to it:

```ts
requestState(req).shared.auth = { can: { invite: true } }
// the page gets: auth: { can: { invite: true }, user: { id: 1, name: 'Ada' } }
```

If your `auth` is anything other than a plain object, it's replaced by `{ user }`.

Without `auth.share`, nothing about the user is shared. In development, nestjs-mvc then logs a warning once if `request.user` is set, because the user never reaches the page.

{% callout title="Only return safe fields" type="warning" %}
Whatever `share` returns is written into the HTML source of every first load. Pick the fields the page needs; never return the whole user record.
{% /callout %}

## Precedence

The props a page gets are built in this order, and a later key replaces an earlier one with the same name:

1. `errors`, the validation errors from the previous request
2. the shared props, with `auth.user` merged in
3. the props the handler returned

The replacement is shallow. If the handler returns `auth`, the shared `auth` (with its `user`) is gone for that page, not merged.

```ts
this.view.share('title', 'Acme')
return { title: 'Dashboard' }   // the page gets title: 'Dashboard'
```

## What happens on the wire

Shared props sit in `props` next to the handler's own, and their top level keys are listed in `sharedProps`:

```json
{
  "component": "Dashboard",
  "props": {
    "errors": {},
    "appName": "Acme CRM",
    "auth": { "user": { "id": 1, "name": "Ada" } },
    "stats": { "users": 42 }
  },
  "url": "/dashboard",
  "version": "a1b2c3",
  "sharedProps": ["appName", "auth"]
}
```

`sharedProps` is left out when nothing was shared, and when you set `exposeSharedProps: false`. It's there on partial reloads too. The client uses it for instant visits: it carries those props into the placeholder page it shows while the real one loads, so your layout's user menu doesn't blink.

## Partial reloads and always()

On a [partial reload](/docs/partial-reloads), shared props follow the same filter as the others. A reload with `only: ['stats']` leaves out `appName` and `auth` and doesn't call their functions.

When a shared prop has to come along on every response, partial reloads included, wrap it in [`always()`](/docs/always):

```ts
import { always, requestState } from 'nestjs-mvc'

requestState(req).shared.unread = always(() => this.messages.countUnread(req))
```

## On the page

Shared props are ordinary props, so the page component receives them too. Layouts usually read them with `usePage()`:

{% framework-code %}
```tsx
import { usePage } from 'nestjs-mvc/react'

type Shared = { appName: string; auth: { user: { id: number; name: string } | null } }

export function Header() {
  const { props } = usePage<Shared>()

  return (
    <header>
      {props.appName}
      {props.auth.user ? <span>{props.auth.user.name}</span> : <a href="/login">Log in</a>}
    </header>
  )
}
```

```vue
<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'

type Shared = { appName: string; auth: { user: { id: number; name: string } | null } }

const page = usePage<Shared>()
</script>

<template>
  <header>
    {{ page.props.appName }}
    <span v-if="page.props.auth.user">{{ page.props.auth.user.name }}</span>
    <a v-else href="/login">Log in</a>
  </header>
</template>
```
{% /framework-code %}

## Combining it with other features

* **Error pages** only get shared props when the page you return from `errorPages` sets `shared: true`. The default is `false`. See [Error pages](/docs/error-pages).
* **[once()](/docs/once-props)** in shared data lets the browser keep a value across pages, like a list of countries every form needs.
* **Changing users.** When the logged in user changes, the client is reset with a full page load, so no shared data of the previous user stays in memory. See [Login redirects](/docs/login-redirects).

## Pitfalls

* **Keys with dots are not paths.** `share('nav.items', [...])` creates one prop literally named `nav.items`, not `items` inside `nav`. Share `{ nav: { items: [...] } }` instead.
* **Don't share a key called `errors`.** It replaces the validation errors.
* **A value, not a function, runs too early.** `shared.user = req.user` in a middleware reads `req.user` before your guards have run, so a guard that sets it comes too late. Use a function, or `auth.share`.

## See also

* [Data on every page](/docs/shared-data), the guide.
* [Authentication](/docs/authentication), for the user.
* [always()](/docs/always) and [Partial reloads](/docs/partial-reloads).
* [ViewService](/docs/view-service).
