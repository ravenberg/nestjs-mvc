---
title: Partial reloads
---

A partial reload asks the server for some props of the current page instead of all of them. The server resolves only those, and the client merges them into the page it already shows. {% .lead %}

## Starting one

From the client, `router.reload` with `only` or `except`:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

router.reload({ only: ['messages'] })
router.reload({ except: ['sidebar'] })
router.reload({ only: ['messages'], data: { after: lastId }, preserveUrl: true })
router.reload({ only: ['messages'], reset: ['messages'] })
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

router.reload({ only: ['messages'] })
router.reload({ except: ['sidebar'] })
router.reload({ only: ['messages'], data: { after: lastId }, preserveUrl: true })
router.reload({ only: ['messages'], reset: ['messages'] })
</script>
```
{% /framework-code %}

| Option | Meaning |
|---|---|
| `only` | Prop paths to resolve. Dot paths work: `'auth.user'`. |
| `except` | Prop paths to leave out. It wins over `only`. |
| `data` | Query parameters for the request (it's a `GET` to the current URL). |
| `preserveUrl` | Keep the current URL in the address bar and on the page, even when `data` adds parameters. |
| `reset` | Props whose merge should start over (see [Reset](#reset)). |

`router.reload` visits the current URL, keeps scroll position and component state, and doesn't cancel other requests. `router.visit`, `router.get` and `Link` take `only` and `except` too:

{% framework-code %}
```tsx
import { Link } from 'nestjs-mvc/react'

<Link href="/inbox?folder=archive" only={['messages']} preserveState>
  Archive
</Link>
```

```vue
<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'
</script>

<template>
  <Link href="/inbox?folder=archive" :only="['messages']" preserve-state>
    Archive
  </Link>
</template>
```
{% /framework-code %}

`Deferred`, `WhenVisible`, `usePoll` and `InfiniteScroll` all work by sending partial reloads.

## What happens on the wire

The client sends the component it currently shows, plus the paths:

```http
GET /inbox HTTP/1.1
X-Inertia: true
X-Inertia-Version: …
X-Inertia-Partial-Component: Inbox
X-Inertia-Partial-Data: messages,unread
X-Inertia-Partial-Except: sidebar
X-Inertia-Reset: messages
```

| Header | Sent when | Content |
|---|---|---|
| `X-Inertia-Partial-Component` | `only`, `except` or `reset` is set | The current page's component name |
| `X-Inertia-Partial-Data` | `only` or `reset` is set | `only` plus `reset`, comma separated |
| `X-Inertia-Partial-Except` | `except` is set | Comma separated paths |
| `X-Inertia-Reset` | `reset` is set | Comma separated paths |

The server treats the request as partial only when `X-Inertia-Partial-Component` equals the component the handler renders, and `X-Inertia-Partial-Data` or `X-Inertia-Partial-Except` isn't empty. Otherwise it answers with a normal full response.

The response is a normal page object with fewer props. It never contains `deferredProps`, and `mergeProps`, `onceProps` and `scrollProps` only list props that were resolved.

## What the server does

Your controller method runs in full, like on any request. What changes is how its return value (together with the shared props and `errors`) is resolved:

1. A path in `except`, or under one, is left out without being evaluated.
2. With `only`, a path is resolved when it's named, or when it sits under a named path. `only: ['auth']` resolves everything in `auth`.
3. A path that is a parent of a named one is opened to reach it, and only the named branch is kept. For `only: ['auth.user']`, the `auth` closure runs and the response is `{ auth: { user: … } }`.
4. Everything else is left out, and its closure is never called.
5. With `except` and no `only`, every path not excluded counts as named, including `optional()` and `defer()` props.

The work you do in the handler body is not skipped. Put it in closures to make it lazy (see [Lazy props](/docs/lazy-props)).

## How each kind of prop behaves

"Asked for" means the path is named in `only` (or sits under a named path), or the reload uses only `except` and doesn't exclude it.

| Prop | Asked for | Not asked for |
|---|---|---|
| Plain value | Sent | Left out (the handler already computed it) |
| Closure | Called and sent | Left out, not called |
| [`defer()`](/docs/defer) | Called and sent; `rescue` applies | Left out, not called, not announced again |
| [`optional()`](/docs/optional) | Called and sent | Left out, not called |
| [`always()`](/docs/always) | Sent | Sent, even when listed in `except` (see its page for nested props and objects) |
| [`merge()`](/docs/merge) and friends | Sent and listed in `mergeProps`, `prependProps` or `deepMergeProps`, so the client merges | Left out, not listed |
| [`once()`](/docs/once-props) | Called and sent even if the browser has a copy, and listed in `onceProps` | Left out; the browser keeps its copy |
| [`scroll()`](/docs/scroll) | Called and sent, its list labelled for merging and its cursor in `scrollProps` | Left out |

## What the client does with the answer

When the response is for the same component, the client merges it into the current page:

- props in the response replace the ones the page has, key by key at the top level,
- props not in the response stay as they were,
- props listed in `mergeProps`, `prependProps` or `deepMergeProps` are merged into the existing value instead of replacing it,
- for dot paths in `only` or `except`, the top level object is merged deeply, so `only: ['auth.user']` doesn't wipe the rest of `auth`.

A full response (no partial headers, or a component mismatch) replaces the props completely.

## Component mismatch

`X-Inertia-Partial-Component` carries the component the page *had* when the request left. If the handler renders a different one (a `Link` with `only` to another kind of page, or a redirect), the server ignores all partial headers and sends a full response for the new component. `optional()` props are left out and `defer()` props announced as usual.

## Reset

A `merge()` or `scroll()` prop is normally merged into what the page has. Name it in `reset` to replace it instead, for example when the user changes a filter:

```http
X-Inertia-Partial-Data: messages
X-Inertia-Reset: messages
```

The client adds reset props to `X-Inertia-Partial-Data`, so they are always resolved. The server then leaves them out of `mergeProps`, `prependProps` and `deepMergeProps`, and a `scroll()` prop's entry in `scrollProps` gets `reset: true` so the client starts its paging over.

## Pitfalls

{% callout title="except alone resolves everything else" type="warning" %}
`router.reload({ except: ['sidebar'] })` asks for every other prop, including `optional()` and `defer()` props, and `once()` props the browser already holds. Use `only` to keep the reload small.
{% /callout %}

{% callout title="A reload without only or except is a full reload" %}
`router.reload()` with neither option sends no partial headers. The server answers like a normal visit: `optional()` props are dropped and `defer()` props are fetched again.
{% /callout %}

## See also

- [Loading data later](/docs/loading-data), the guide
- [Lazy props](/docs/lazy-props)
- [defer()](/docs/defer), [optional()](/docs/optional), [always()](/docs/always)
- [merge(), prepend(), deepMerge()](/docs/merge), [once()](/docs/once-props), [scroll()](/docs/scroll)
- [Polling](/docs/polling)
