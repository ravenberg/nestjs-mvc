---
title: Prefetch requests
---

A prefetch is an ordinary Inertia `GET` that the browser sends before the user clicks, marked with a `Purpose: prefetch` header. Your handler answers it like a visit, and the browser keeps the response for when the click comes. {% .lead %}

## What the server receives

```http
GET /users HTTP/1.1
X-Inertia: true
X-Requested-With: XMLHttpRequest
X-Inertia-Version: 1a2b3c
X-Inertia-Except-Once-Props: countries
Purpose: prefetch
```

* It's always a `GET`: the client throws `Prefetch requests must use the GET method` for anything else.
* The browser never prefetches the page it is on.
* It doesn't send a prefetch while one for the same visit is still running, or while it has a cached copy that isn't stale yet (see below).
* When the user then clicks and the cached response is used, **no request reaches the server** for that click.

## isPrefetch()

```ts
import { isPrefetch } from 'nestjs-mvc'

isPrefetch(req: AnyRequest): boolean
```

It returns `true` when the request has `Purpose: prefetch`. It takes the request as your platform gives it (Express or Fastify):

```ts
import { Controller, Get, Param, Req } from '@nestjs/common'
import { View, isPrefetch, type AnyRequest } from 'nestjs-mvc'

@Controller('posts')
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly metrics: MetricsService,
  ) {}

  @Get(':id')
  @View('Posts/Show')
  async show(@Param('id') id: string, @Req() req: AnyRequest) {
    const post = await this.posts.find(id)
    if (!isPrefetch(req)) this.metrics.record('post.opened', id)
    return { post }
  }
}
```

Keep in mind that when the prefetched response is used, the click itself sends nothing. A counter that skips prefetches never counts those clicks. See the side effects section below.

## What nestjs-mvc does differently for a prefetch

Almost nothing: guards, pipes, your handler and all prop rules run as for a visit. Three things are different:

* **The intended URL.** A `401` on a prefetch doesn't remember the URL for `intended()`, so hovering a protected link can't overwrite where the user was going.
* **The user cookie.** A prefetch doesn't record which user the browser last saw, since it isn't a page the user opened.
* **Redirects with a fragment.** For a visit, a redirect to a URL with `#…` is answered with `409` and `X-Inertia-Redirect`, so the client keeps the fragment. A prefetch gets the normal `302`.

A prefetch from a page rendered for another user is answered with a `409` like any other request from that page. The browser acts on it only when the user clicks the link.

## Props on a prefetch

A prefetch is a visit, not a partial reload, so the usual rules for a visit apply:

* **`optional()`** props are left out.
* **`defer()`** props are left out and announced in `deferredProps`. Their closures don't run on hover: the browser fetches them after the click, when the page is shown, with a normal partial reload that has no `Purpose` header.
* **`once()`** props the page on screen holds are listed in `X-Inertia-Except-Once-Props`, so the server skips them. When the prefetch arrives, the browser fills them in from the page on screen. Whenever the page on screen changes and has once props, the browser fills its cached prefetches in again from that page, and drops deferred props from them that are now filled. A cached prefetch is thrown away no later than the earliest `expiresAt` of its once props.
* **`merge()`** labels are sent, but a prefetch that becomes a visit replaces the props like any visit.

## How long the browser keeps it

| Setting | Default |
|---|---|
| `cacheFor` on a link or in `router.prefetch()` | 30 seconds (`prefetch.cacheFor`, 30000 ms) |
| `cacheFor` when the link only has `prefetch="click"` | 0: used once, for that click |
| Hover delay before a hover prefetch | 75 ms (`prefetch.hoverDelay`) |

`cacheFor` is a number of milliseconds or a string with a unit: `ms`, `s`, `m`, `h` or `d` (`'30s'`, `'5m'`).

With two values, `[stale, expires]`, the copy is used in two stages:

* **Until `stale`:** another prefetch of the same visit does nothing, and a click uses the copy.
* **From `stale` until `expires`:** a click still uses the copy, and the next prefetch (hovering again, say) fetches a new one in the background, which replaces the old copy when it arrives.
* **After `expires`:** the copy is gone and a click is a normal visit.

The browser matches a cached copy on the whole visit: URL, method, data, headers (apart from `Purpose`), `only` and the like. A prefetch with different `data` is a different entry.

## Throwing copies away

Nothing on the server can clear the browser's cache. The browser does it:

* A visit that didn't come from the cache clears the cached copy of its own URL when it succeeds.
* `router.flush(href, options)` removes one entry, `router.flushAll()` removes everything, and `router.flushByCacheTags(tags)` removes the entries with those tags.
* Tag entries with `cacheTags` on the link, or in `router.prefetch(href, options, { cacheFor, cacheTags })`.
* The `invalidateCacheTags` visit option removes entries with those tags once that visit succeeds, which suits a form that changes the data.

## On the page

{% framework-code %}
```tsx
import { Link, useForm } from 'nestjs-mvc/react'

export default function Products() {
  const form = useForm({ name: '' })

  const save = () => form.post('/products', { invalidateCacheTags: ['products'] })

  return (
    <>
      <Link href="/products/archive" prefetch cacheFor={['30s', '5m']} cacheTags="products">
        Archive
      </Link>
      <button onClick={save}>Save</button>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { Link, useForm } from 'nestjs-mvc/vue'

const form = useForm({ name: '' })

const save = () => form.post('/products', { invalidateCacheTags: ['products'] })
</script>

<template>
  <Link href="/products/archive" prefetch :cache-for="['30s', '5m']" cache-tags="products">Archive</Link>
  <button @click="save">Save</button>
</template>
```
{% /framework-code %}

To prefetch from code, call `router.prefetch('/products/archive', {}, { cacheFor: '1m' })`. `usePrefetch()` tells a page whether it was prefetched (`isPrefetched`, `isPrefetching`, `lastUpdatedAt`) and gives it a `flush()`.

## Side effects to avoid

{% callout title="A GET may run without a click" type="warning" %}
Hover, mount and mouse down all send a request before the user decided anything. A `GET` that marks a message as read, sends an email or changes data does that on hover, even if the user never opens the page.
{% /callout %}

* Put changes behind a `POST`, `PUT`, `PATCH` or `DELETE`. The client never prefetches those.
* Don't count page views in a `GET` handler. A prefetch counts a view nobody made, and a click served from the cache counts nothing. Record the view from the page itself when it's shown, for example with a small `POST`.
* Prefetch on mount sends one request per link as soon as the links are on screen. Keep it for the page people almost always open next.
* Slow `GET` handlers are slow for prefetches too. Put heavy props in `defer()`: they only run after the click.

## See also

* [Prefetching](/docs/prefetching), the guide
* [once()](/docs/once-props)
* [defer()](/docs/defer)
* [Login redirects](/docs/login-redirects)
