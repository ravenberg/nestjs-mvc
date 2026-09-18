---
title: Prefetching
---

Load a page before the user clicks, so it opens instantly. {% .lead %}

## On hover

Add `prefetch` to a link:

{% framework-code %}
```tsx
<Link href="/users" prefetch>
  Users
</Link>
```

```vue
<Link href="/users" prefetch>
  Users
</Link>
```
{% /framework-code %}

When the mouse rests on the link, the browser fetches the page data in the background, so the page is already there when they click.

## Other moments

{% framework-code %}
```tsx
<Link href="/users" prefetch="mount">Users</Link>   {/* as soon as the link is on screen */}
<Link href="/users" prefetch="click">Users</Link>   {/* on mouse down, just before the click */}
```

```vue
<Link href="/users" prefetch="mount">Users</Link>   <!-- as soon as the link is on screen -->
<Link href="/users" prefetch="click">Users</Link>   <!-- on mouse down, just before the click -->
```
{% /framework-code %}

`mount` is good for the one page people almost always open next. Keep it off long lists of links, though, because every link would fetch its page.

## How long it stays fresh

A prefetched page is kept for 30 seconds, and you can change that with {% framework name="react" %}`cacheFor`{% /framework %}{% framework name="vue" %}`cache-for`{% /framework %}:

{% framework-code %}
```tsx
<Link href="/users" prefetch cacheFor="1m">Users</Link>
```

```vue
<Link href="/users" prefetch cache-for="1m">Users</Link>
```
{% /framework-code %}

You can also show the cached page right away and fetch a fresh copy in the background:

{% framework-code %}
```tsx
<Link href="/users" prefetch cacheFor={['30s', '5m']}>Users</Link>
```

```vue
<Link href="/users" prefetch :cache-for="['30s', '5m']">Users</Link>
```
{% /framework-code %}

For the first 30 seconds the cached page is used as it is. After that, up to 5 minutes, it's still shown but refreshed in the background.

## Throw away old copies

After a change, cached pages can be out of date. If you tag them, you can clear them by tag:

{% framework-code %}
```tsx
<Link href="/products" prefetch cacheTags="products">Products</Link>
```

```vue
<Link href="/products" prefetch cache-tags="products">Products</Link>
```
{% /framework-code %}

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

form.post('/products', {
  onSuccess: () => router.flushByCacheTags('products'),
})
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

form.post('/products', {
  onSuccess: () => router.flushByCacheTags('products'),
})
</script>
```
{% /framework-code %}

`router.flushAll()` clears everything.

## The server

Your server stays the same, because a prefetch is a normal `GET` to your controller.

{% callout title="Keep GET free of changes" type="warning" %}
A prefetch calls your `GET` handlers before anyone clicks. So a `GET` that marks a message as read or counts a view would do that on hover. Put changes like that behind a `POST`.
{% /callout %}

What a prefetch looks like to your server and how the cache works is in the [reference](/docs/prefetch-requests).
