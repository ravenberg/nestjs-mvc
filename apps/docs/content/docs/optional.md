---
title: optional()
---

`optional()` keeps a prop on the server until the browser asks for it by name in a partial reload. It is never part of a normal page load. {% .lead %}

## Signature

```ts
import { optional } from 'nestjs-mvc'

optional<T>(value: () => T | Promise<T>): OptionalProp<T>
```

It takes one function and no options. The function runs only in a partial reload that asks for the prop.

```ts
@Get(':id')
@View('Invoices/Show')
show(@Param('id', ParseIntPipe) id: number) {
  return {
    invoice: () => this.invoices.find(id),
    history: optional(() => this.invoices.history(id)),
  }
}
```

## What happens on the wire

On the first load and on every Inertia visit, the prop is simply not there. Unlike [`defer()`](/docs/defer), nothing in the page object mentions it, and the client won't fetch it by itself:

```json
{
  "component": "Invoices/Show",
  "props": { "errors": {}, "invoice": { "id": 7 } },
  "url": "/invoices/7",
  "version": "…"
}
```

When the page asks for it, the client sends a partial reload that names the prop:

```http
GET /invoices/7 HTTP/1.1
X-Inertia: true
X-Inertia-Partial-Component: Invoices/Show
X-Inertia-Partial-Data: history
```

The response carries `history` (plus `errors` and any `always()` props). The client merges it into the page's props and keeps the rest as it was.

## When it resolves

| Request | `history` |
|---|---|
| First load, Inertia visit, `router.reload()` without `only` or `except` | Left out, not called |
| Partial reload with `only: ['history']` | Resolved |
| Partial reload with `only` naming a parent path | Resolved |
| Partial reload with `only` naming something else | Left out, not called |
| Partial reload with only `except` (no `only`) that doesn't exclude it | Resolved |
| Partial reload that lists it in `except` | Left out, not called |

A parent path counts: for `auth: { invoices: optional(fn) }`, both `only: ['auth.invoices']` and `only: ['auth']` resolve it. Nested optional props are always named by their dot path.

## On the page

The prop is `undefined` until you load it. Load it with `router.reload({ only })`, a `Link` with `only`, or `WhenVisible`:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

export default function Show({ invoice, history }: Props) {
  return (
    <>
      <h1>Invoice {invoice.id}</h1>
      {history ? (
        <HistoryList items={history} />
      ) : (
        <button onClick={() => router.reload({ only: ['history'] })}>Show history</button>
      )}
    </>
  )
}
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

defineProps<{ invoice: Invoice; history?: HistoryEntry[] }>()
</script>

<template>
  <h1>Invoice {{ invoice.id }}</h1>
  <HistoryList v-if="history" :items="history" />
  <button v-else @click="router.reload({ only: ['history'] })">Show history</button>
</template>
```
{% /framework-code %}

`router.reload` visits the current URL again, keeps scroll position and component state, and sends the partial headers. Once loaded, the prop stays on the page for later partial reloads that don't ask for it. A full visit to the page (a `Link` to the same URL without `only`, say) drops it again.

## Typical uses

- **Tabs.** Each tab's data is `optional()`. Switching tabs reloads `only: ['<tab prop>']`.
- **Dialogs and drawers.** Load the details when the dialog opens.
- **Exports and reports.** Build the file only when the user asks.
- **Content below the fold.** With `WhenVisible`, the reload happens when the element scrolls into view. See [Loading data later](/docs/loading-data#load-when-it-scrolls-into-view).

## optional() or defer()?

Both keep the prop out of the first response and resolve it in a partial reload. The difference is who starts that reload:

- `defer()`: the client, straight after the page renders, always.
- `optional()`: you, when you decide to (a click, a tab, visibility), or never.

## Pitfalls

{% callout title="Reloads with only except" type="warning" %}
A partial reload that sets `except` but no `only` asks for everything it doesn't exclude, so every `optional()` and `defer()` prop on the page resolves. Use `only` when you want to keep them on the server.
{% /callout %}

{% callout title="The handler still runs" %}
The partial reload calls your controller method in full. Only the other props' closures are skipped, so keep expensive work inside closures. See [Lazy props](/docs/lazy-props).
{% /callout %}

## See also

- [Loading data later](/docs/loading-data), the guide
- [Partial reloads](/docs/partial-reloads)
- [defer()](/docs/defer), [Lazy props](/docs/lazy-props)
