---
title: "@View()"
---

`@View()` turns a controller method into a page: the object it returns becomes the props of a frontend component, sent as a full HTML page on the first load and as JSON on every visit after that. {% .lead %}

## Signature

```ts
import { View } from 'nestjs-mvc'

View(component: string): MethodDecorator
```

| Argument | Type | Meaning |
| --- | --- | --- |
| `component` | `string` | The page component to render. Sent to the browser unchanged, as `component` in the page object. |

`@View()` goes on a method, never on a class. It only stores the component name as metadata; the global interceptor that `MvcModule` registers does the rendering.

```ts
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  @View('Users/Show')
  async show(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findOne(id)
    return { user: { id: user.id, name: user.name } }
  }
}
```

The handler may be `async`. If it returns `undefined` or `null`, the page gets no props of its own (it still gets `errors` and the shared props).

## Component names

The name is a path under your pages folder, without the extension. With the `nestjsMvc()` Vite plugin, `Users/Show` is looked up as `frontend/pages/Users/Show` plus the framework's extension. {% framework name="react" %}For React the plugin tries `.tsx`, then `.jsx`.{% /framework %}{% framework name="vue" %}For Vue it looks for `.vue`.{% /framework %} The folder is the plugin's `pages` option, `frontend/pages` by default.

The server never checks that the component exists. A typo shows up in the browser, as the error `Page "Users/Shw" not found. Expected frontend/pages/Users/Shw...`.

## The page object

Every render produces one page object. These fields are always there:

| Field | What it holds |
| --- | --- |
| `component` | The name you passed to `@View()`. |
| `props` | Your props after resolving them (see below), plus `errors` and the shared props. |
| `url` | The path and query string of the request, as the client asked for it. |
| `version` | The asset version from the module's `version` option, or `null` when you set none. When a user is logged in, a digest of who the page was rendered for is added after a `#`. |

The renderer adds these only when they apply, so a simple page does not carry them:

| Field | Added when |
| --- | --- |
| `deferredProps` | A prop uses [`defer()`](/docs/defer), or a deferred [`scroll()`](/docs/scroll). |
| `mergeProps`, `prependProps`, `deepMergeProps`, `matchPropsOn` | A prop uses [`merge()`, `prepend()` or `deepMerge()`](/docs/merge), or `scroll()`. |
| `scrollProps` | A prop uses [`scroll()`](/docs/scroll). |
| `onceProps` | A prop uses [`once()`](/docs/once-props). |
| `rescuedProps` | A `defer(fn, { rescue: true })` closure threw. |
| `flash` | Something was [flashed](/docs/flash), on this request or the one before the redirect. |
| `encryptHistory` | [History encryption](/docs/encrypt-history) is on for this page. Only ever `true`. |
| `clearHistory` | `clearHistory()` was called, or the logged in user changed. Only ever `true`. |
| `preserveFragment` | [`preserveFragment()`](/docs/view-service) was called. Only ever `true`. |
| `sharedProps` | Something was [shared](/docs/shared-props) and `exposeSharedProps` is not `false`. |

## What happens on the wire

The same handler answers two kinds of request.

### First load

A request without the `X-Inertia` header (typing the URL, a refresh, a link from another site) gets HTML:

```http
GET /users/1 HTTP/1.1
Accept: text/html
```

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Vary: X-Inertia
```

The body is your `template` (or a minimal default document) with the page object in a script element, followed by the element your app mounts on:

```html
<script data-page="app" type="application/json">{"component":"Users\/Show","props":{"errors":{},"user":{"id":1,"name":"Ada"}},"url":"\/users\/1","version":"a1b2c3"}</script><div id="app"></div>
```

Every `/` in the JSON is written as `\/`, so a string like `</script>` inside a prop can't close the element early. The JSON is not HTML escaped, because browsers don't decode entities inside a script. When the route is [server rendered](/docs/ssr), the rendered markup takes the place of these two elements.

### Inertia visit

Once your app runs in the browser, a `Link` click or a form sends the same request with `X-Inertia: true` and the version of the page it is on:

```http
GET /users/1 HTTP/1.1
X-Inertia: true
X-Inertia-Version: a1b2c3
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Inertia: true
Vary: X-Inertia
```

```json
{
  "component": "Users/Show",
  "props": { "errors": {}, "user": { "id": 1, "name": "Ada" } },
  "url": "/users/1",
  "version": "a1b2c3"
}
```

Both responses carry `Vary: X-Inertia`, so a cache never serves the JSON to a first load or the HTML to a visit.

## Asset version

Set `version` in `MvcModule.forRoot()` to a string, or a function that returns one (it may be `async`). Typically it's a hash of your build manifest.

```ts
MvcModule.forRoot({ vite: {}, version: () => manifestHash() })
```

On every Inertia `GET`, a middleware compares the version the client sent with the current one, before routing. When they differ, the handler doesn't run:

```http
HTTP/1.1 409 Conflict
X-Inertia-Location: /users/1
X-Inertia-Version: d4e5f6
```

The client answers a `409` with `X-Inertia-Location` with a full page load of that URL, so the tab picks up the new scripts. Flash data waiting for this client is left alone, so it survives that reload. Without a `version` option there is no check.

Only the asset part of the version counts here. The part after `#` (who the page was rendered for) is checked later, after your guards, as described in [Login redirects](/docs/login-redirects).

## How props resolve

Before anything is sent, the renderer walks the object you returned:

* **Plain values** are sent as they are.
* **Functions** are called (and awaited) at render time, so `{ stats: () => this.stats.today() }` only runs the query when the prop is actually sent. On a [partial reload](/docs/partial-reloads) that doesn't ask for `stats`, the function isn't called at all.
* **Plain objects and arrays** are walked all the way down, including the value a function returns. Functions and helpers like `defer()` or `optional()` work at any depth, and their paths use dots: `auth.notifications`, `items.0.price`.
* **Class instances** (entities, `Date`, `Map` and so on) are not walked. They're serialized as JSON, the way `JSON.stringify` would.

```ts
@Get()
@View('Dashboard')
dashboard() {
  return {
    user: { id: 1, name: 'Ada' },               // sent as is
    stats: () => this.stats.today(),            // called at render time
    team: async () => ({
      members: await this.team.members(),
      invites: defer(() => this.team.invites()), // announced as "team.invites"
    }),
  }
}
```

The props that reach the page are, in this order: `errors` (validation errors from the previous request, always sent), then the [shared props](/docs/shared-props), then yours. A later key replaces an earlier one with the same name.

## Returning something other than a page

A handler with `@View()` always renders its return value as props. To answer differently, leave the page flow:

* **Redirect** with [`ViewService`](/docs/view-service): `redirect()`, `back()`, `intended()` and `location()` throw, so the handler stops and no page is rendered.
* **Throw** an `HttpException`. It goes to Nest's exception handling, or to your [error page](/docs/error-pages) when `errorPages` is configured.
* **A file or plain JSON** belongs on a route without `@View()`. Those routes are left to Nest: a returned object becomes JSON, a `StreamableFile` streams, and nothing gets an `X-Inertia` header.

```ts
@Get('export')
export() {
  return new StreamableFile(this.reports.csv())  // no @View(): Nest handles it
}
```

## On the page

The props arrive as the component's props, and `usePage()` gives you the whole page object:

{% framework-code %}
```tsx
import { usePage } from 'nestjs-mvc/react'

export default function Show({ user }: { user: { id: number; name: string } }) {
  const page = usePage()

  return (
    <h1>
      {user.name} ({page.component} at {page.url})
    </h1>
  )
}
```

```vue
<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'

defineProps<{ user: { id: number; name: string } }>()
const page = usePage()
</script>

<template>
  <h1>{{ user.name }} ({{ page.component }} at {{ page.url }})</h1>
</template>
```
{% /framework-code %}

## Combining it with other features

* `@Ssr()` on the same handler or its controller renders the first load on the server. See [@Ssr()](/docs/ssr).
* `@EncryptHistory()` on the same handler or its controller encrypts the page in the browser's history. See [History encryption](/docs/encrypt-history).
* [`defer()`](/docs/defer), [`optional()`](/docs/optional), [`always()`](/docs/always), [`merge()`](/docs/merge), [`scroll()`](/docs/scroll) and [`once()`](/docs/once-props) are all props you return from a `@View()` handler.

## Pitfalls

{% callout title="Everything you return is public" type="warning" %}
The props end up in the page source on the first load. Return the fields the page shows, not a whole entity that might carry a password hash.
{% /callout %}

* **A promise is not a function.** `{ user: this.users.findOne(id) }` sends the promise object, which serializes as `{}`. Either `await` it or wrap it: `{ user: () => this.users.findOne(id) }`.
* **Don't return a prop called `errors`.** It replaces the validation errors the page would otherwise get.
* **`@Res()` takes over the response.** With `@Res()` (without `passthrough`) your return value isn't used, so no page is rendered.

## See also

* [Your first page](/docs/your-first-page) and [How it works](/docs/how-it-works), the guides.
* [ViewService](/docs/view-service), for redirects and per request settings.
* [Shared props](/docs/shared-props), for data on every page.
* [Lazy props](/docs/lazy-props) and [Partial reloads](/docs/partial-reloads).
