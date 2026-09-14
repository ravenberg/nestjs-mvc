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

When the mouse rests on the link, the browser fetches the page data in the background, so the page is already there when they click.

## Other moments

```tsx
<Link href="/users" prefetch="mount">Users</Link>   {/* as soon as the link is on screen */}
<Link href="/users" prefetch="click">Users</Link>   {/* on mouse down, just before the click */}
```

`mount` is good for the one page people almost always open next. Keep it off long lists of links, though, because every link would fetch its page.

## How long it stays fresh

A prefetched page is kept for 30 seconds, and you can change that with `cacheFor`:

```tsx
<Link href="/users" prefetch cacheFor="1m">Users</Link>
```

You can also show the cached page right away and fetch a fresh copy in the background:

```tsx
<Link href="/users" prefetch cacheFor={['30s', '5m']}>Users</Link>
```

For the first 30 seconds the cached page is used as it is. After that, up to 5 minutes, it's still shown but refreshed in the background.

## Throw away old copies

After a change, cached pages can be out of date. If you tag them, you can clear them by tag:

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

Your server stays the same, because a prefetch is a normal `GET` to your controller.

{% callout title="Keep GET free of changes" type="warning" %}
A prefetch calls your `GET` handlers before anyone clicks. So a `GET` that marks a message as read or counts a view would do that on hover. Put changes like that behind a `POST`.
{% /callout %}
