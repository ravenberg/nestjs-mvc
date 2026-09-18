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

`router.reload({ only })` calls the same controller again and only resolves the props you name, so the rest of the page stays as it is.

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

## Refresh on a timer

`usePoll` reloads props on an interval you give in milliseconds. It works well for a live counter or a status page:

{% framework-code %}
```tsx
import { usePoll } from 'nestjs-mvc/react'

export default function Status({ queue }: { queue: number }) {
  usePoll(5000, { only: ['queue'] })
  return <p>{queue} jobs waiting</p>
}
```

```vue
<script setup lang="ts">
import { usePoll } from 'nestjs-mvc/vue'

defineProps<{ queue: number }>()
usePoll(5000, { only: ['queue'] })
</script>

<template>
  <p>{{ queue }} jobs waiting</p>
</template>
```
{% /framework-code %}

The modes, background tabs and what the server sees on each tick are in the [polling reference](/docs/polling).

## Which one to pick

| You want | Use |
|---|---|
| The page to show before slow data is ready | `defer()` |
| Data only after a click | `optional()` and `router.reload({ only })` |
| Data when it scrolls into view | `optional()` and `WhenVisible` |
| Data that updates on its own | `usePoll` |

{% callout title="Only what's asked for runs" %}
When the browser asks for `only: ['export']`, the functions for the other props don't get called. So wrapping a query in a function is enough to keep it from running when nobody needs it.
{% /callout %}

Every option and edge case is in the reference pages for [defer()](/docs/defer), [optional()](/docs/optional), [lazy props](/docs/lazy-props) and [partial reloads](/docs/partial-reloads).
