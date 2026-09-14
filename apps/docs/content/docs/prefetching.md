---
title: Prefetching
---

Load a page before the user clicks, so it opens instantly. {% .lead %}

## On hover

Add `prefetch` to a link:

```tsx
<Link href="/users" prefetch>
  Users
</Link>
```

When the mouse rests on the link, the browser fetches the page data in the background. The click then shows the page without waiting.

## Other moments

```tsx
<Link href="/users" prefetch="mount">Users</Link>   {/* as soon as the link is on screen */}
<Link href="/users" prefetch="click">Users</Link>   {/* on mouse down, just before the click */}
```

Use `mount` for the one page a user almost always opens next. Do not use it on long lists of links: every link would fetch a page.

## How long it stays fresh

A prefetched page is kept for 30 seconds by default. Change it with `cacheFor`:

```tsx
<Link href="/users" prefetch cacheFor="1m">Users</Link>
```

Show the cached page right away and fetch a fresh copy behind the scenes:

```tsx
<Link href="/users" prefetch cacheFor={['30s', '5m']}>Users</Link>
```

For 30 seconds the cached page is used as is. Up to 5 minutes it is shown and refreshed in the background.

## Throw away old copies

After a change, cached pages can be out of date. Tag them, and clear by tag:

```tsx
<Link href="/products" prefetch cacheTags="products">Products</Link>
```

```tsx
import { router } from 'nestjs-mvc/react'

form.post('/products', {
  onSuccess: () => router.flushByCacheTags('products'),
})
```

`router.flushAll()` clears everything.

## The server

Nothing to change. A prefetch is a normal `GET` to your controller.

{% callout title="GET must not change anything" type="warning" %}
A prefetch calls your `GET` handlers without a click. A `GET` that marks a message as read or counts a view would do that on hover. Put changes behind `POST`.
{% /callout %}
