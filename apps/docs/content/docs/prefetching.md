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

For the first 30 seconds the cached page is used as it is. After that, up to 5 minutes, a click still shows it, and the next prefetch (hovering the link again, say) fetches a fresh copy in the background. After 5 minutes it's gone and a click loads the page as usual.

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

## In detail

### Checking a prefetch in your handler

A prefetch carries a `Purpose: prefetch` header, and `isPrefetch()` checks it for you:

```ts
import { View, isPrefetch, type AnyRequest } from 'nestjs-mvc'

@Get(':id')
@View('Posts/Show')
async show(@Param('id') id: string, @Req() req: AnyRequest) {
  const post = await this.posts.find(id)
  if (!isPrefetch(req)) this.metrics.record('post.opened', id)
  return { post }
}
```

Keep in mind that when the click uses the prefetched page, it doesn't reach your server at all. So a counter that skips prefetches misses those clicks, and one that doesn't counts hovers nobody followed. If you need to count page views, send a small `POST` from the page once it's shown.

### Which links get prefetched

Only `GET` requests are prefetched, and `prefetch` on a link with another method throws an error. The browser doesn't prefetch the page it's already on, and it doesn't ask again while a prefetch for the same link is still running or its copy is still fresh. A hover prefetch waits 75 milliseconds, so moving the mouse across a list doesn't fetch every link on the way.

A link with only `prefetch="click"` keeps its page just for that click. For every other link the 30 seconds apply.

### Writing the time

{% framework name="react" %}`cacheFor`{% /framework %}{% framework name="vue" %}`cache-for`{% /framework %} takes a number of milliseconds, or a string with a unit: `ms`, `s`, `m`, `h` or `d`, like `'30s'` or `'5m'`.

### What runs on a prefetch

Your guards, pipes and handler run just like for a click. Data you load with `defer()` isn't: it's fetched after the click, when the page shows, so slow props in `defer()` keep prefetches quick. Props in `optional()` are left out as usual, and `once()` props the current page already has are filled in from there.

A prefetch that hits a protected page gets the usual answer, but it doesn't change where the user goes after logging in. Only a page they really opened does that.

### Throwing old copies away

Nothing on the server can clear the browser's cache, so it happens in the browser:

* A normal visit to a page clears the cached copy of that page.
* `router.flush('/users')` removes one page, next to `router.flushAll()` and `router.flushByCacheTags()`.
* A form can clear tags itself once it succeeds, with `form.post('/products', { invalidateCacheTags: ['products'] })`.

The cache matches the whole request: `/users` with other `data` is a separate copy.

### Prefetching from code

`router.prefetch('/products/archive', {}, { cacheFor: '1m' })` prefetches without a link. On the page, `usePrefetch()` tells you whether the page was prefetched, with `isPrefetched` and `lastUpdatedAt`.
