---
title: defer()
---

`defer()` leaves a prop out of the page response and lets the browser fetch it right after the page renders, so slow data doesn't hold up the page. {% .lead %}

## Signature

```ts
import { defer } from 'nestjs-mvc'

defer<T>(value: () => T | Promise<T>, options?: string | DeferOptions): DeferProp<T>

interface DeferOptions {
  group?: string
  rescue?: boolean
}
```

| Option | Type | Default | Meaning |
|---|---|---|---|
| `group` | `string` | `'default'` | Deferred props in the same group are fetched in one follow-up request. |
| `rescue` | `boolean` | `false` | If the closure throws, leave the prop out and report it, instead of failing the request. |

Passing a string is short for `{ group }`:

```ts
return {
  stats: defer(() => this.stats.calculate()),
  activity: defer(() => this.activity.recent(), 'sidebar'),
  suggestions: defer(() => this.suggestions.forUser(), { group: 'sidebar', rescue: true }),
}
```

The value must be a function. It runs only when the browser asks for the prop.

## What happens on the wire

On the first load and on every Inertia visit, the deferred props are left out of `props` and listed under `deferredProps`, by group:

```json
{
  "component": "Dashboard",
  "props": { "errors": {}, "user": { "name": "Ada" } },
  "url": "/dashboard",
  "version": "…",
  "deferredProps": {
    "default": ["stats"],
    "sidebar": ["activity", "suggestions"]
  }
}
```

The closures haven't run at this point. Once the page has rendered, the client sends one partial reload per group, all at the same time:

```http
GET /dashboard HTTP/1.1
X-Inertia: true
X-Inertia-Partial-Component: Dashboard
X-Inertia-Partial-Data: activity,suggestions
```

Your controller method runs again, and this time only the named props resolve. The response carries them (plus `errors` and any `always()` props), and no `deferredProps`:

```json
{
  "component": "Dashboard",
  "props": { "errors": {}, "activity": [], "suggestions": [] },
  "url": "/dashboard",
  "version": "…"
}
```

The client merges these props into the page. Each group arrives on its own, so a slow group doesn't hold up a fast one. That's the reason to use groups: put slow props in their own group, and fast ones together.

## Behaviour

- **First load and visits.** The prop is announced in `deferredProps` and never resolved in the same response. The client fetches it after the page swaps in.
- **Partial reloads.** A deferred prop resolves only when the reload asks for it (by its path or a parent path). Otherwise it's left out and not announced again. A reload that only uses `except` asks for everything it doesn't exclude, so deferred props resolve there too. See [Partial reloads](/docs/partial-reloads).
- **Nesting.** A `defer()` inside a plain object or a closure's return value is announced by its dot path, for example `"default": ["auth.notifications"]`, and fetched with that path.
- **Back button.** When the browser restores a page from history and some deferred props are missing, the client fetches those again.
- **Errors and flash.** The follow-up requests keep the page's current validation errors and flash data, so a deferred load doesn't wipe a form's errors.

## Rescue

Without `rescue`, a closure that throws fails the follow-up request, just like an exception in your handler. With `rescue: true` the rest of the response is sent and the failing prop is:

- left out of `props` (missing, not `null`),
- listed by path in `rescuedProps`,
- passed to the `onRescue` module option.

```json
{
  "component": "Dashboard",
  "props": { "errors": {}, "activity": [] },
  "url": "/dashboard",
  "version": "…",
  "rescuedProps": ["suggestions"]
}
```

`rescue` only applies to `defer()` props. Errors in plain closures and other helpers still fail the response.

### onRescue

By default a rescued error is logged as a warning (logger context `MvcProps`) that names the prop and the component. Set `onRescue` to send it somewhere else:

```ts
MvcModule.forRoot({
  // reportError stands for your error tracker
  onRescue: (error, path) => reportError(error, { prop: path }),
})
```

It gets the error and the prop's dot path.

The client keeps `rescuedProps` across partial reloads. A path leaves the list when a later reload asks for that prop again.

## On the page

`Deferred` shows its fallback until every prop in `data` has arrived. `data` takes one path or an array of paths.

{% framework-code %}
```tsx
import { Deferred } from 'nestjs-mvc/react'

export default function Dashboard({ suggestions }: Props) {
  return (
    <Deferred
      data="suggestions"
      fallback={<p>Loading suggestions…</p>}
      rescue={<p>Suggestions are unavailable right now.</p>}
    >
      {({ reloading }) => <SuggestionList items={suggestions} dimmed={reloading} />}
    </Deferred>
  )
}
```

```vue
<script setup lang="ts">
import { Deferred } from 'nestjs-mvc/vue'

defineProps<{ suggestions?: Suggestion[] }>()
</script>

<template>
  <Deferred data="suggestions">
    <template #fallback>
      <p>Loading suggestions…</p>
    </template>
    <template #rescue>
      <p>Suggestions are unavailable right now.</p>
    </template>
    <template #default="{ reloading }">
      <SuggestionList :items="suggestions" :dimmed="reloading" />
    </template>
  </Deferred>
</template>
```
{% /framework-code %}

What it shows:

- all props in `data` are there and none was rescued: the content,
- one of them is in `rescuedProps` and you gave a rescue: the rescue,
- otherwise: the fallback.

A rescued prop without a rescue keeps showing the fallback. The content and the rescue both get `reloading`, which is `true` while a partial reload for one of those props is on its way.

## Combining it with merge

A deferred prop replaces what the page has. To add to a list instead, put a [`merge()`](/docs/merge) inside the object the closure returns:

```ts
feed: defer(() => ({
  items: merge(() => this.feed.page(1)),
})),
```

The follow-up request lists `feed.items` in `mergeProps`, and later reloads of `feed` append to it. For a paginated list, [`scroll()`](/docs/scroll) with `defer: true` does this for you.

## Pitfalls

{% callout title="Don't nest the helpers directly" type="warning" %}
`merge(defer(fn))` and `defer(() => merge(fn))` don't work: the page receives the helper object itself. Put the inner helper in a plain object, as above.
{% /callout %}

{% callout title="The handler runs once per group" type="warning" %}
Every group is a separate request to your controller method. Keep expensive work inside the closures, not in the handler body, or it runs again for each group.
{% /callout %}

## See also

- [Loading data later](/docs/loading-data), the guide
- [Lazy props](/docs/lazy-props), [optional()](/docs/optional)
- [Partial reloads](/docs/partial-reloads)
- [scroll()](/docs/scroll), [merge(), prepend(), deepMerge()](/docs/merge)
