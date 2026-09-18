---
title: scroll()
---

`scroll()` wraps one page of a paginated list. The page object then says which pages come before and after it, so `InfiniteScroll` can fetch them and merge them into the list. {% .lead %}

## Signature

```ts
import { scroll, type ScrollPage } from 'nestjs-mvc'

scroll<T = ScrollPage>(value: () => T | Promise<T>, options?: ScrollOptions<T>): ScrollProp<T>

interface ScrollOptions<T> {
  wrapper?: string
  matchOn?: string
  defer?: boolean | string
  metadata?: (value: T) => ScrollMetadata
}

interface ScrollMetadata {
  pageName: string
  previousPage: number | string | null
  nextPage: number | string | null
  currentPage: number | string | null
}
```

The value is always a function. It runs when the prop is resolved: on a first load, a visit, or a partial reload that asks for it.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `wrapper` | `string` | `'data'` | The key that holds the array of items. |
| `matchOn` | `string` | none | The field that identifies an item, so a page fetched again updates items instead of adding them twice. |
| `defer` | `boolean` or `string` | `false` | Load the first page after the page shows, like `defer()`. `true` uses the `default` group, a string names the group. |
| `metadata` | `(value) => ScrollMetadata` | none | Reads the cursor from a value that isn't shaped like a `ScrollPage`. |

## What your closure returns

Without a `metadata` reader, the closure returns a `ScrollPage`:

```ts
interface ScrollPage<T> {
  data?: T[]                              // or whatever key `wrapper` names
  pageName?: string                       // default 'page'
  currentPage?: number | string | null    // default null
  previousPage?: number | string | null   // default null
  nextPage?: number | string | null       // default null
  [key: string]: unknown                  // anything else travels as it is
}
```

* The whole object is the prop. Extra fields, like `total`, reach the page untouched.
* Page identifiers can be numbers (page numbers, offsets) or strings (cursors).
* `nextPage: null` means there is nothing after this page, and `previousPage: null` means nothing before it. The client checks these as plain truthy values, so `0` and `''` also mean "no more".
* `pageName` is the query parameter the client sends to ask for a page. nestjs-mvc doesn't read it for you: your handler reads it, and the two must use the same name.

If the value isn't an object with an array under the wrapper key, and there is no `metadata` reader, the request fails with:

```text
[nestjs-mvc] scroll() prop "posts" must resolve to an object with a "data" array (a ScrollPage), or pass a `metadata` reader for your own paginator shape.
```

### A paginate helper

nestjs-mvc has no paginator of its own. A helper only has to return the shape above. For page numbers:

```ts
import type { ScrollPage } from 'nestjs-mvc'

export async function paginate<T>(
  page: number,
  perPage: number,
  fetch: (skip: number, take: number) => Promise<[T[], number]>,
): Promise<ScrollPage<T>> {
  const [data, total] = await fetch((page - 1) * perPage, perPage)

  return {
    data,
    total,
    currentPage: page,
    previousPage: page > 1 ? page - 1 : null,
    nextPage: page * perPage < total ? page + 1 : null,
  }
}
```

```ts
@Get()
@View('Posts/Index')
index(@Query('page') page = '1') {
  return {
    posts: scroll(() =>
      paginate(Number(page), 20, (skip, take) => this.posts.findAndCount({ skip, take })),
    ),
  }
}
```

If you already have a paginator with its own shape, keep it and pass `metadata`:

```ts
posts: scroll(() => this.posts.paginate(Number(page)), {
  metadata: (result) => ({
    pageName: 'page',
    currentPage: result.meta.page,
    previousPage: result.meta.page > 1 ? result.meta.page - 1 : null,
    nextPage: result.meta.page < result.meta.pageCount ? result.meta.page + 1 : null,
  }),
})
```

With a `metadata` reader nothing checks the shape, but the client still merges the array under `wrapper`, so it has to be there.

## What happens on the wire

On a first load or a visit, the page object carries the page, a merge label for its array, and the cursor under `scrollProps`:

```json
{
  "component": "Posts/Index",
  "props": {
    "errors": {},
    "posts": {
      "data": [{ "id": 21, "title": "…" }],
      "total": 340,
      "currentPage": 2,
      "previousPage": 1,
      "nextPage": 3
    }
  },
  "url": "/posts?page=2",
  "version": "1a2b3c",
  "mergeProps": ["posts.data"],
  "scrollProps": {
    "posts": { "pageName": "page", "previousPage": 1, "nextPage": 3, "currentPage": 2, "reset": false }
  }
}
```

With `matchOn: 'id'`, the page object also has `"matchPropsOn": ["posts.data.id"]`.

### How InfiniteScroll asks for a page

When the end of the list comes into view, `InfiniteScroll` reloads the current URL with the page parameter set, asks only for its prop, and says which end the page belongs to:

```http
GET /posts?page=3 HTTP/1.1
X-Inertia: true
X-Inertia-Partial-Component: Posts/Index
X-Inertia-Partial-Data: posts
X-Inertia-Infinite-Scroll-Merge-Intent: append
```

* The page parameter is added to the query of the URL the browser is on, so filters already in the URL go along.
* Scrolling up sends `X-Inertia-Infinite-Scroll-Merge-Intent: prepend` with `previousPage`. The server then labels the array in `prependProps` instead of `mergeProps`, and the client puts the page in front. Any other value, or no header, means append.
* Only `posts` is resolved; the closures of the other props don't run.
* The request doesn't change the browser's URL. The client does that itself, see URL syncing below.

The client merges the array as described on the [merge page](/docs/merge). Other fields of the prop, like `total`, come from the latest page.

### How the client keeps its place

The client starts from the `scrollProps` entry of the page: `previousPage`, `nextPage` and `currentPage`. After each page it loads, it takes the new `nextPage` (or `previousPage`, when scrolling up) from the response. It remembers this in the history entry, so after going back to the list it continues where it was.

## URL syncing

While the user scrolls, the client sets `?page=` (or your `pageName`) in the address bar to the page with the most items on screen. This uses `router.replace`, so no request goes to the server. Page 1 removes the parameter.

That means a refresh can open the list in the middle, at `/posts?page=5`. Your handler has to handle any page as the first one, with a correct `previousPage`, so scrolling up works from there.

Set the `preserveUrl` prop on `InfiniteScroll` to turn URL syncing off.

## Resetting when filters change

When a filter changes, the old items have to go. Visit with `reset`:

```ts
router.get('/posts', { tag }, { only: ['posts'], reset: ['posts'] })
```

```http
GET /posts?tag=nestjs HTTP/1.1
X-Inertia: true
X-Inertia-Partial-Component: Posts/Index
X-Inertia-Partial-Data: posts
X-Inertia-Reset: posts
```

For a scroll prop named in `X-Inertia-Reset`, the server leaves out the merge label, so the client replaces the list, and sets `reset: true` on its cursor:

```json
{
  "scrollProps": {
    "posts": { "pageName": "page", "previousPage": null, "nextPage": 2, "currentPage": 1, "reset": true }
  }
}
```

When the client sees `reset: true`, it takes `previousPage`, `nextPage` and `currentPage` from this response and starts counting again.

## Deferring the first page

With `defer`, the first load leaves the page out. It is announced in `deferredProps` and the merge label is already there, but there is no cursor yet:

```json
{
  "deferredProps": { "default": ["posts"] },
  "mergeProps": ["posts.data"]
}
```

The client's follow-up request loads the page and its `scrollProps`. `InfiniteScroll` reads `scrollProps` when it mounts, and throws `The page object does not contain a scroll prop named "posts".` when the entry isn't there. So wrap it in `Deferred`:

{% framework-code %}
```tsx
import { Deferred, InfiniteScroll } from 'nestjs-mvc/react'

export default function Index({ posts }: Props) {
  return (
    <Deferred data="posts" fallback={<p>Loading posts…</p>}>
      <InfiniteScroll data="posts">
        {posts?.data.map((post) => <article key={post.id}>{post.title}</article>)}
      </InfiniteScroll>
    </Deferred>
  )
}
```

```vue
<script setup lang="ts">
import { Deferred, InfiniteScroll } from 'nestjs-mvc/vue'

defineProps<{ posts?: { data: { id: number; title: string }[] } }>()
</script>

<template>
  <Deferred data="posts">
    <template #fallback>
      <p>Loading posts…</p>
    </template>
    <InfiniteScroll data="posts">
      <article v-for="post in posts?.data" :key="post.id">{{ post.title }}</article>
    </InfiniteScroll>
  </Deferred>
</template>
```
{% /framework-code %}

## On the page

`InfiniteScroll` takes the prop's name in `data`. A filter that resets the list:

{% framework-code %}
```tsx
import { InfiniteScroll, router } from 'nestjs-mvc/react'

interface Props {
  posts: { data: { id: number; title: string }[]; total: number }
}

export default function Index({ posts }: Props) {
  const filter = (tag: string) => router.get('/posts', { tag }, { only: ['posts'], reset: ['posts'] })

  return (
    <>
      <select onChange={(event) => filter(event.target.value)}>
        <option value="">All</option>
        <option value="nestjs">NestJS</option>
      </select>
      <p>{posts.total} posts</p>
      <InfiniteScroll data="posts">
        {posts.data.map((post) => (
          <article key={post.id}>{post.title}</article>
        ))}
      </InfiniteScroll>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { InfiniteScroll, router } from 'nestjs-mvc/vue'

defineProps<{ posts: { data: { id: number; title: string }[]; total: number } }>()

const filter = (tag: string) => router.get('/posts', { tag }, { only: ['posts'], reset: ['posts'] })
</script>

<template>
  <select @change="filter(($event.target as HTMLSelectElement).value)">
    <option value="">All</option>
    <option value="nestjs">NestJS</option>
  </select>
  <p>{{ posts.total }} posts</p>
  <InfiniteScroll data="posts">
    <article v-for="post in posts.data" :key="post.id">{{ post.title }}</article>
  </InfiniteScroll>
</template>
```
{% /framework-code %}

A few props of `InfiniteScroll` change what the server receives:

* `params`: extra reload options for every page request. Its `only` is added to the scroll prop, its `data` and `headers` go along.
* `onlyNext` and `onlyPrevious`: only ever load in one direction.
* `preserveUrl`: don't sync the page to the address bar.

## Combining it with other features

* [merge()](/docs/merge): `scroll()` uses the same labels, on `<prop>.<wrapper>`. Everything there about `matchOn` and `reset` applies.
* [defer()](/docs/defer): use the `defer` option instead of wrapping `scroll()` in `defer()`; one helper can't wrap another.
* [Partial reloads](/docs/partial-reloads): a page request is a partial reload for one prop, so the rest of your handler's props stay untouched and their closures don't run.

## Pitfalls

{% callout title="Filters need a reset" type="warning" %}
Without `reset`, a filter change is a partial reload like any other, and the new results are added to the old ones.
{% /callout %}

* Read the page parameter in your handler, under the same name as `pageName`.
* Return `null` for `nextPage` on the last page, or the client keeps asking.
* The closure has to return an object with the array under `wrapper`. A bare array fails the request.
* A deferred scroll prop needs `Deferred` around `InfiniteScroll`.
* A page opened in the middle (`?page=5`) needs a correct `previousPage`.

## See also

* [Infinite scroll](/docs/infinite-scroll), the guide
* [merge(), prepend(), deepMerge()](/docs/merge)
* [defer()](/docs/defer)
* [Partial reloads](/docs/partial-reloads)
