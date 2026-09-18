---
title: once()
---

`once()` sends a prop the first time and then lets the browser reuse its copy. The server keeps nothing: the browser says which copies it holds, and the server skips those. {% .lead %}

## Signature

```ts
import { once } from 'nestjs-mvc'

once<T>(value: () => T | Promise<T>, options?: OnceOptions): OnceProp<T>

interface OnceOptions {
  as?: string
  until?: number | Date
  fresh?: boolean
}
```

| Option | Type | Default | Meaning |
|---|---|---|---|
| `as` | `string` | the prop's dot path | The key the copy is kept under. Props on different pages with the same key share one copy. |
| `until` | `number` or `Date` | none | A number is a time to live in **seconds**, counted from this response. A `Date` is a fixed moment. Without it the copy has no expiry. |
| `fresh` | `boolean` | `false` | Resolve and send the prop on this response, even if the browser says it has it. |

To make the next page send a new copy after a change, there is also `ViewService.refresh()`:

```ts
refresh(...keys: string[]): this
```

A `once()` instance holds no value and no cache, so you can create it once at module level and return it from every request.

## What happens on the wire

On the first visit, the prop is sent and described under `onceProps`:

```json
{
  "component": "Addresses/Create",
  "props": { "errors": {}, "countries": ["NL", "BE"] },
  "url": "/addresses/create",
  "version": "1a2b3c",
  "onceProps": {
    "countries": { "prop": "countries", "expiresAt": null }
  }
}
```

The key of each entry is `as`, or the prop's dot path. `prop` is where the value lives on this page. `expiresAt` is `null` without `until`, or a time in epoch milliseconds, computed on the server.

On a later visit, the browser lists the keys it holds:

```http
GET /addresses/create HTTP/1.1
X-Inertia: true
X-Inertia-Except-Once-Props: countries
```

For a key in that list the server doesn't call the closure and leaves the prop out. It still sends the `onceProps` entry, because that is what tells the browser to put its copy back in:

```json
{
  "component": "Addresses/Create",
  "props": { "errors": {} },
  "url": "/addresses/create",
  "version": "1a2b3c",
  "onceProps": {
    "countries": { "prop": "countries", "expiresAt": null }
  }
}
```

## Where the browser keeps the copy

There is no separate store in the browser. The copy is the prop on the page that is on screen. From the client's source:

* The browser lists a key in `X-Inertia-Except-Once-Props` when the page on screen has it in `onceProps`, the prop has a value, and `expiresAt` is `null` or still in the future by the browser's clock.
* When a response names a key that the page on screen also has, and the response left the prop out, the browser copies the value over to the new page, under the new page's `prop` path. It keeps the old `expiresAt`, so visiting again doesn't extend the time to live.

What follows from that:

* The copy lasts as long as each page you visit returns the same key. Visit a page without it, and the copy is gone: the next page that has the key gets it from the server again.
* A full page load sends no header, so everything is resolved again.
* Back and forward restore a page from browser history as it was, copy included.
* With `as`, two pages share a copy only if you go from one straight to the other. The value must have the same shape on both.

## When the closure runs

| Request | Closure called? | `onceProps` entry |
|---|---|---|
| First load (HTML) | Yes, there is no header | Sent |
| Visit, key not in the header | Yes | Sent |
| Visit, key in the header | No, the prop is left out | Sent |
| Visit, key in the header, but `fresh` or refreshed | Yes | Sent |
| Partial reload that asks for the prop | Yes, the header is ignored | Sent |
| Partial reload for other props | No | Not sent; the browser keeps its entries |

When a copy expires, the browser stops listing its key. The next visit resolves the prop and the new response brings a new `expiresAt`.

## Refreshing after a change

### fresh

`fresh: true` resolves the prop on every response that includes it, as if the browser held nothing. It's meant for a condition you work out per request:

```ts
@Get('create')
@View('Addresses/Create')
create(@Query('reload') reload?: string) {
  return {
    countries: once(() => this.countries.findAll(), { fresh: reload === '1' }),
  }
}
```

### view.refresh()

Call `refresh()` with the keys in the handler that changes the data:

```ts
@Post('countries')
async addCountry(@Body() dto: CreateCountryDto) {
  await this.countries.create(dto)
  return this.view.refresh('countries').back()
}
```

The key is the `as` value, or the prop's dot path when there is no `as`.

### Exactly when a refresh is used up

1. `refresh()` queues the keys on the current request.
2. If this same request renders a page, that render uses them.
3. If it redirects instead (`redirect()`, `back()`, `intended()`, `location()`, a redirect after a validation error, or `res.redirect()` on Express), the keys are written into the flash bag, next to any flash messages. By default that is the `mvc_flash` cookie, which the browser keeps for 300 seconds.
4. The **next request that renders a page** reads the bag and clears it. That is any render: a first load, a visit, a partial reload, a deferred props request, a poll tick or a prefetch, of any page.
5. In that render, a key forces the closure to run only if the page has a `once()` prop with that key, on a visit or first load. (On a partial reload that asks for the prop, it runs anyway.)
6. After that render the key is gone, whether it was used or not.

A request that doesn't render leaves the bag alone: another redirect carries it forward, and so do the `409` answers for a new asset version and for a change of user. A request that neither renders nor redirects, like a handler that returns JSON, drops the keys.

{% callout title="A refresh is lost when the next page doesn't have the prop" type="warning" %}
The refresh goes to the next page that renders, not to the next page that has the prop. If the mutation redirects to a page without that `once()` prop, the key is used up there and has no effect.

Usually no harm is done, because the browser also dropped its copy when it left the pages with that key. But the back button brings back a page from history with the old copy, and from there the browser lists the key again. Redirect to a page that returns the prop (`back()` from the form that uses it, typically), or set `until` so old copies expire.
{% /callout %}

## On the page

A `once()` prop is an ordinary prop on the page. To fetch a new copy from the browser, reload it: a partial reload that asks for the prop always resolves it.

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

export default function Create({ countries }: { countries: string[] }) {
  return (
    <>
      <select>
        {countries.map((country) => (
          <option key={country}>{country}</option>
        ))}
      </select>
      <button type="button" onClick={() => router.reload({ only: ['countries'] })}>
        Reload countries
      </button>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

defineProps<{ countries: string[] }>()
</script>

<template>
  <select>
    <option v-for="country in countries" :key="country">{{ country }}</option>
  </select>
  <button type="button" @click="router.reload({ only: ['countries'] })">Reload countries</button>
</template>
```
{% /framework-code %}

## Combining it with other features

* **Shared props:** `once()` works at any depth, in shared data too. Its key is then the dot path, like `auth.permissions`, unless you set `as`. See [Shared props](/docs/shared-props).
* **Prefetching:** a prefetch lists the keys of the page on screen, and the browser fills the left out props from that page when the prefetch arrives. A cached prefetch is thrown away no later than the earliest `expiresAt` of its once props. See [Prefetch requests](/docs/prefetch-requests).
* **Polling:** a tick with `only` that doesn't name the prop leaves it alone. A tick without `only` is a visit, so the prop is skipped while the browser holds it. See [Polling](/docs/polling).
* **Logging in as someone else:** when nestjs-mvc can tell users apart, the next visit after a change of user becomes a full page load, so nobody sees copies the previous user loaded. See [Authentication](/docs/authentication).

## Pitfalls

{% callout title="until is in seconds" type="warning" %}
`until: 300` is five minutes. A value in milliseconds keeps the copy for a very long time.
{% /callout %}

* Other users see a change when their copy expires or they leave the pages that carry it. Don't use `once()` for data that must always be current.
* Two props with the same `as` key share one copy, so they must hold the same data in the same shape.
* `expiresAt` is set by the server's clock and checked against the browser's. A large clock difference moves the expiry.
* A refresh is used up by the next render, see above.

## See also

* [Data the browser keeps](/docs/once), the guide
* [Partial reloads](/docs/partial-reloads)
* [Prefetch requests](/docs/prefetch-requests)
* [ViewService](/docs/view-service)
