---
title: merge(), prepend(), deepMerge()
---

These three helpers label a prop so the browser merges a reload into what it already has, instead of replacing it. This page covers every option, the labels in the page object, and exactly how the client merges. {% .lead %}

## Signature

```ts
import { merge, prepend, deepMerge } from 'nestjs-mvc'

merge<T>(value: T | (() => T | Promise<T>), options?: MergeOptions): MergeProp<T>
prepend<T>(value: T | (() => T | Promise<T>), options?: Omit<MergeOptions, 'prepend'>): MergeProp<T>
deepMerge<T>(value: T | (() => T | Promise<T>), options?: Omit<MergeOptions, 'deep'>): MergeProp<T>

interface MergeOptions {
  prepend?: boolean | string[]
  append?: string[]
  deep?: boolean
  matchOn?: string | string[]
}
```

`prepend(value, options)` is `merge(value, { ...options, prepend: true })`, and `deepMerge(value, options)` is `merge(value, { ...options, deep: true })`.

The value can be a plain value or a function. A function only runs when the prop is actually resolved, so on a partial reload that doesn't ask for it, it never runs.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `prepend` | `boolean` or `string[]` | `false` | `true` puts new items in front of the old ones. An array names nested paths (relative to the prop) that prepend, like `['data']`. |
| `append` | `string[]` | none | Nested paths (relative to the prop) that append, instead of the prop as a whole. |
| `deep` | `boolean` | `false` | Merge objects and arrays recursively. Wins over `prepend` and `append`. |
| `matchOn` | `string` or `string[]` | none | The field that identifies an item, relative to the prop: `'id'` for the prop's own array, `'data.id'` for a nested one. |

## What happens on the wire

The server doesn't merge anything. It resolves the prop as usual and adds labels to the page object that tell the client what to do with it:

| You write | Page object |
|---|---|
| `messages: merge(fn)` | `"mergeProps": ["messages"]` |
| `messages: prepend(fn)` | `"prependProps": ["messages"]` |
| `feed: merge(fn, { append: ['data'] })` | `"mergeProps": ["feed.data"]` |
| `feed: merge(fn, { prepend: ['data'] })` | `"prependProps": ["feed.data"]` |
| `board: deepMerge(fn)` | `"deepMergeProps": ["board"]` |
| `messages: merge(fn, { matchOn: 'id' })` | `"mergeProps": ["messages"], "matchPropsOn": ["messages.id"]` |

The rules, in order:

* `deep` wins: a deep prop is only listed in `deepMergeProps`, whatever `prepend` or `append` say.
* When `append` or `prepend` name nested paths, those paths are labelled and the prop itself is not.
* Every `matchOn` field becomes `<prop path>.<field>` in `matchPropsOn`.
* A prop nested in an object uses its dot path, like `dashboard.feed`, at any depth.
* The labels only appear when the prop is in the response. A prop that a partial reload leaves out adds no labels.

A reload that asks for new messages looks like this:

```http
GET /chat?after=41 HTTP/1.1
X-Inertia: true
X-Inertia-Partial-Component: Chat
X-Inertia-Partial-Data: messages
```

```json
{
  "component": "Chat",
  "props": {
    "errors": {},
    "messages": [{ "id": 42, "body": "Hi" }]
  },
  "url": "/chat?after=41",
  "version": "1a2b3c",
  "mergeProps": ["messages"],
  "matchPropsOn": ["messages.id"]
}
```

The labels are sent on a first load too, but the client ignores them there. See the next section.

## When the client merges

The client only merges on a **partial reload** that comes back with the **same component**. A partial reload is a visit with `only`, `except` or `reset`. Every other response replaces the prop, labels or not. That includes clicking a link to the page you are on and `router.reload()` without `only`.

### Append and prepend

For a prop in `mergeProps` or `prependProps`:

* If the new value is an array, the client joins it with the array it has: after it for `mergeProps`, in front of it for `prependProps`. If it had nothing yet, it starts from an empty array.
* If the new value is an object, the client merges it one level deep (`{ ...old, ...new }`). This is the same for append and prepend.

### Matching items with matchOn

With a `matchPropsOn` entry for the array, items are compared on that field:

* **Append:** an old item with the same value is replaced by the new one, **in the same position**. New items that match nothing are added at the end.
* **Prepend:** old items with the same value are removed, and **all** new items go to the front in the order the server sent them. So an updated item moves to the top of the list; it is not updated in place.
* Items that don't have the field at all are always added.

The client finds the field by taking the `matchPropsOn` entry minus its last segment and comparing that to the merged path. `feed.data.id` applies to `feed.data`. That's why `matchOn` is relative to the prop and has to include the nested path: `merge(fn, { append: ['data'], matchOn: 'data.id' })`.

### Deep merge

For a prop in `deepMergeProps`, the client walks the new value:

* Objects are merged key by key, recursively.
* Arrays are appended to the old array, or matched when a `matchPropsOn` entry points at that array. `deepMerge(fn, { matchOn: 'columns.id' })` on `board` gives `board.columns.id`, which matches items in `board.columns`.
* Anything else (strings, numbers) replaces the old value.

A deep merge never prepends.

## Starting over with reset

Pass `reset` to throw away what the client has and take the response as it is:

```ts
router.reload({ only: ['messages'], reset: ['messages'] })
```

The client adds the reset props to `X-Inertia-Partial-Data` (so `reset` alone is enough to ask for them) and sends them in `X-Inertia-Reset`:

```http
GET /chat HTTP/1.1
X-Inertia: true
X-Inertia-Partial-Component: Chat
X-Inertia-Partial-Data: messages
X-Inertia-Reset: messages
```

For a merge prop whose path is in `X-Inertia-Reset`, the server leaves out every label, `matchPropsOn` included. The client sees an unlabelled prop and replaces it. The path has to be the prop's own dot path: `reset: ['feed']` resets `feed: merge(…, { append: ['data'] })`, and `reset: ['feed.data']` does not.

## On the server

* The closure runs on a first load, on a visit, and on a partial reload that asks for the prop (or for something inside it). Nothing else calls it.
* The server remembers nothing between requests. Working out what is new is up to you, usually from a query parameter the client sends, like `after` below.
* A merge prop works inside plain objects, arrays and the return values of closures, like the other helpers.

## On the page

Ask for the prop with `only` and send what the server needs to find the new items:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

interface Props {
  messages: { id: number; body: string }[]
}

export default function Chat({ messages }: Props) {
  const loadNewer = () =>
    router.reload({
      only: ['messages'],
      data: { after: messages.at(-1)?.id ?? 0 },
      preserveUrl: true,
    })

  return (
    <>
      {messages.map((message) => (
        <p key={message.id}>{message.body}</p>
      ))}
      <button onClick={loadNewer}>Load newer</button>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

const props = defineProps<{ messages: { id: number; body: string }[] }>()

const loadNewer = () =>
  router.reload({
    only: ['messages'],
    data: { after: props.messages.at(-1)?.id ?? 0 },
    preserveUrl: true,
  })
</script>

<template>
  <p v-for="message in messages" :key="message.id">{{ message.body }}</p>
  <button @click="loadNewer">Load newer</button>
</template>
```
{% /framework-code %}

On a `GET`, `data` goes into the query string, and the response's URL becomes the page's URL. `preserveUrl: true` keeps the address bar at `/chat` instead of `/chat?after=41`.

## Combining it with other features

### scroll()

[`scroll()`](/docs/scroll) labels the array inside a page of results (`posts.data`) in `mergeProps` or `prependProps`, with the same client behaviour. Use it for paginated lists: it also keeps track of the pages.

### defer()

The helpers don't wrap one another: `defer(() => merge(…))` sends the inner helper object to the page instead of your data. Put the merge prop inside an object the deferred closure returns:

```ts
feed: defer(() => ({ items: merge(this.feed.latest()) }))
```

The follow-up request that loads `feed` labels `feed.items`. For a paginated list, `scroll(fn, { defer: true })` does this for you. See [defer()](/docs/defer).

### Polling

A poll tick with `only` is a partial reload, so a merge prop in it is merged on every tick. See [Polling](/docs/polling).

## Pitfalls

{% callout title="Only partial reloads merge" type="warning" %}
A full visit to the same page, or a reload without `only`, `except` or `reset`, replaces the prop. If your list suddenly shows only the newest items, check that the reload names the prop in `only`.
{% /callout %}

* If the closure returns the whole list instead of just the new items, every reload adds it again. Return only what's new, or set `matchOn` so repeated items are replaced.
* With `prepend()` and `matchOn`, an edited item jumps to the top of the list.
* `matchOn` is relative to the prop and must include a nested path: `'data.id'`, not `'id'`, when you append to `data`.
* `reset` must name the merge prop's own path.

## See also

* [Growing lists](/docs/merging-props), the guide
* [scroll()](/docs/scroll)
* [Partial reloads](/docs/partial-reloads)
* [defer()](/docs/defer)
* [Polling](/docs/polling)
