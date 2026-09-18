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

## In detail

### Keep the work inside the function

Every reload calls your controller method again: each click on "Load export", each group of deferred props, each poll tick. What gets skipped is the functions of the props nobody asked for. So a query you run in the handler body, like `const project = await this.projects.find(id)`, runs every time. Move it into the prop's function and it only runs when that prop is needed.

A plain function works for this too, without any helper. It runs on every normal page load and is skipped on a reload that asks for something else.

Props are resolved one after the other. Two slow queries in two functions take as long as both together, so if they can run side by side, start them in one function:

```ts
dashboard: async () => {
  const [orders, visits] = await Promise.all([this.orders.today(), this.visits.today()])
  return { orders, visits }
},
```

### Several slow props at once

All deferred props arrive in one follow-up request by default. Give a prop a group name and each group gets its own request, sent side by side, so a slow group doesn't hold up a fast one:

```ts
stats: defer(() => this.stats.calculate()),
activity: defer(() => this.activity.recent(), 'sidebar'),
suggestions: defer(() => this.suggestions.forUser(), { group: 'sidebar', rescue: true }),
```

A string is short for `{ group }`. `Deferred` takes one name or a list in `data`, and shows its fallback until all of them are there.

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

### Asking for props by name

`only` takes dots for nested data: `only: ['auth.user']` sends `user` and leaves the rest of `auth` on the page as it was. Naming a parent, `only: ['auth']`, sends everything inside it, including any `optional()` or `defer()` props in there.

`except` does the opposite, but careful: `router.reload({ except: ['sidebar'] })` on its own asks for every other prop, `optional()` and `defer()` props included. And `router.reload()` with neither option reloads the whole page, so optional props are dropped again and deferred props are fetched again. To keep a reload small, use `only`.

Once an optional prop is loaded it stays on the page through later reloads that ask for something else. A normal visit to the page drops it.

### Polling options

`usePoll` takes a third argument:

```ts
usePoll(5000, { only: ['queue'] }, { mode: 'rest', keepAlive: false, autoStart: true })
```

- `mode` decides what happens when a tick is still waiting for its answer. `'overlap'` (the default) fires every interval anyway, `'cancel'` cancels the one still running, and `'rest'` waits the full interval after each answer, so requests never overlap.
- In a background tab the poll slows down to one in ten ticks, and picks up again when the tab is visible. `keepAlive: true` keeps the full rate.
- `autoStart: false` doesn't start until you call `start()`. `usePoll` returns `start`, `stop` and `polling`, handy for a pause button.

Always pass `only`. A tick without it reloads every prop on the page and fetches the deferred ones again, every few seconds.

For values that change between ticks, pass a function as the second argument. It's called on every tick:

{% framework-code %}
```tsx
usePoll(3000, () => ({
  only: ['messages'],
  data: { after: messages.at(-1)?.id ?? 0 },
  preserveUrl: true,
}))
```

```vue
<script setup lang="ts">
usePoll(3000, () => ({
  only: ['messages'],
  data: { after: props.messages.at(-1)?.id ?? 0 },
  preserveUrl: true,
}))
</script>
```
{% /framework-code %}

`data` ends up in the query string, and without `preserveUrl` that URL becomes the page's address. To add new messages to the list instead of replacing it, see [Growing lists](/docs/merging-props).

### Put helpers straight on the prop

Return `defer()`, `optional()` and the other helpers directly as a prop, or inside a plain object. Wrapped in a function, `() => defer(fn)`, the page gets the helper itself instead of its data. The same goes for class instances like ORM entities or a `Date`: they're sent as they are, and nothing inside them is called.
