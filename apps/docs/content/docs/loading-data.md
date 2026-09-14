---
title: Loading data later
---

Not all data has to arrive with the page. Slow data can load after the page shows, and some data only when the user asks for it. {% .lead %}

## Load after the page shows

Wrap slow data in `defer()`. The page shows right away, and the data follows in a second request.

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

On the page, wrap the part that needs it in `Deferred`. The `fallback` shows until the data is there:

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

Deferred data that fails should not break the page. Add `rescue: true`, and the page renders without it:

```ts
stats: defer(() => this.stats.calculate(), { rescue: true })
```

## Load only when asked

Wrap data in `optional()` and it is never sent with the page. The browser has to ask for it.

```ts
import { optional } from 'nestjs-mvc'

return {
  invoices: this.invoices.recent(),
  export: optional(() => this.invoices.buildExport()),
}
```

Ask for it with a reload that names the prop:

```tsx
import { router } from 'nestjs-mvc/react'

<button onClick={() => router.reload({ only: ['export'] })}>Load export</button>
```

`router.reload({ only })` calls the same controller again, but only resolves the props you name. The rest of the page stays as it is.

## Load when it scrolls into view

For content further down the page, combine `optional()` with `WhenVisible`. The data loads when the user scrolls to it.

```ts
comments: optional(() => this.comments.forPost(id))
```

```tsx
import { WhenVisible } from 'nestjs-mvc/react'

<WhenVisible data="comments" fallback={<p>Loading comments…</p>}>
  <Comments items={comments} />
</WhenVisible>
```

## Refresh on a timer

`usePoll` reloads props every few milliseconds. Use it for a live counter or a status page:

```tsx
import { usePoll } from 'nestjs-mvc/react'

export default function Status({ queue }: { queue: number }) {
  usePoll(5000, { only: ['queue'] })
  return <p>{queue} jobs waiting</p>
}
```

## Which one to pick

| You want | Use |
|---|---|
| The page to show before slow data is ready | `defer()` |
| Data only after a click | `optional()` and `router.reload({ only })` |
| Data when it scrolls into view | `optional()` and `WhenVisible` |
| Data that updates on its own | `usePoll` |

{% callout title="Nothing runs that is not needed" %}
When the browser asks for `only: ['export']`, the functions for the other props are not called. Wrapping a query in a function is enough to keep it from running.
{% /callout %}
