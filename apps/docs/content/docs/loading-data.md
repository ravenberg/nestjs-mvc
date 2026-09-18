---
title: Loading data later
---

Your data doesn't all have to arrive with the page. Slow data can come in after the page shows, and some data can wait until the user asks for it. {% .lead %}

## Load after the page shows

Wrap slow data in `defer()`. The page shows up right away and the data follows in a second request.

```ts
import { View, defer } from 'nestjs-mvc'

@Get()
@View('Dashboard')
dashboard() {
  return {
    user: { name: 'Ada' },
    stats: defer(() => this.stats.calculate()),
  }
}
```

On the page, wrap the part that needs it in `Deferred`. Until the data is there, it shows {% framework name="react" %}its `fallback`{% /framework %}{% framework name="vue" %}its `#fallback` slot{% /framework %} instead:

{% framework-code %}
```tsx
import { Deferred } from 'nestjs-mvc/react'

export default function Dashboard({ user, stats }: Props) {
  return (
    <>
      <h1>Hi {user.name}</h1>
      <Deferred data="stats" fallback={<p>Loading stats…</p>}>
        <p>{stats?.orders} orders today</p>
      </Deferred>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { Deferred } from 'nestjs-mvc/vue'

defineProps<{ user: { name: string }; stats?: { orders: number } }>()
</script>

<template>
  <h1>Hi {{ user.name }}</h1>
  <Deferred data="stats">
    <template #fallback>
      <p>Loading stats…</p>
    </template>
    <p>{{ stats?.orders }} orders today</p>
  </Deferred>
</template>
```
{% /framework-code %}

If deferred data fails, you probably don't want the whole page to break. Add `rescue: true` and the page renders without it:

```ts
stats: defer(() => this.stats.calculate(), { rescue: true })
```

## Load only when asked

Data wrapped in `optional()` stays on the server until the browser asks for it.

```ts
import { optional } from 'nestjs-mvc'

return {
  invoices: this.invoices.recent(),
  export: optional(() => this.invoices.buildExport()),
}
```

You ask for it with a reload that names the prop:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

<button onClick={() => router.reload({ only: ['export'] })}>Load export</button>
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'
</script>

<template>
  <button @click="router.reload({ only: ['export'] })">Load export</button>
</template>
```
{% /framework-code %}

`router.reload({ only })` calls the same controller again and only resolves the props you name, so the rest of the page stays as it is. The functions of the other props aren't called, so wrapping a query in a function is enough to keep it from running when nobody needs it. [Loading only what you need](/docs/partial-reloads) explains how these reloads work.

## Load when it scrolls into view

For content further down the page, combine `optional()` with `WhenVisible` and the data loads once the user scrolls to it.

```ts
comments: optional(() => this.comments.forPost(id))
```

{% framework-code %}
```tsx
import { WhenVisible } from 'nestjs-mvc/react'

<WhenVisible data="comments" fallback={<p>Loading comments…</p>}>
  <Comments items={comments} />
</WhenVisible>
```

```vue
<script setup lang="ts">
import { WhenVisible } from 'nestjs-mvc/vue'
</script>

<template>
  <WhenVisible data="comments">
    <template #fallback>
      <p>Loading comments…</p>
    </template>
    <Comments :items="comments" />
  </WhenVisible>
</template>
```
{% /framework-code %}

## Which one to pick

| You want | Use |
|---|---|
| The page to show before slow data is ready | `defer()` |
| Data only after a click | `optional()` and `router.reload({ only })` |
| Data when it scrolls into view | `optional()` and `WhenVisible` |

For data that should update on its own every few seconds, see [Keeping data fresh](/docs/polling).

## In detail

### Several slow props at once

All deferred props arrive in one follow-up request by default. Give a prop a group name and each group gets its own request, sent side by side, so a slow group doesn't hold up a fast one:

```ts
stats: defer(() => this.stats.calculate()),
activity: defer(() => this.activity.recent(), 'sidebar'),
suggestions: defer(() => this.suggestions.forUser(), { group: 'sidebar', rescue: true }),
```

A string is short for `{ group }`. `Deferred` takes one name or a list in `data`, and shows its fallback until all of them are there.

Each follow-up request calls your controller method again, so keep slow work [inside the prop functions](/docs/partial-reloads#your-controller-still-runs).

### When deferred data fails

Without `rescue`, a failing function fails the follow-up request, like any exception in your handler. With `rescue: true` the prop is left out (so it's `undefined` on the page, not `null`) and the error is logged as a warning. To send it to your error tracker instead, set `onRescue`, which gets the error and the prop's name:

```ts
MvcModule.forRoot({
  onRescue: (error, path) => reportError(error, { prop: path }),
})
```

`rescue` only exists on `defer()`. An error in any other prop still fails the response.

On the page, give `Deferred` something to show in that case. Without it, the fallback stays up:

{% framework-code %}
```tsx
<Deferred data="stats" fallback={<p>Loading stats…</p>} rescue={<p>Stats are unavailable right now.</p>}>
  <p>{stats?.orders} orders today</p>
</Deferred>
```

```vue
<template>
  <Deferred data="stats">
    <template #fallback>
      <p>Loading stats…</p>
    </template>
    <template #rescue>
      <p>Stats are unavailable right now.</p>
    </template>
    <p>{{ stats?.orders }} orders today</p>
  </Deferred>
</template>
```
{% /framework-code %}

### Put helpers straight on the prop

Return `defer()`, `optional()` and the other helpers directly as a prop, or inside a plain object. Wrapped in a function, `() => defer(fn)`, the page gets the helper itself instead of its data. The same goes for class instances like ORM entities or a `Date`: they're sent as they are, and nothing inside them is called.
