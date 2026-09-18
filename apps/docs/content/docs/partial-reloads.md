---
title: Loading only what you need
---

When one part of a page changes, you don't have to load the whole page again. You can ask the server for just the props you need, and the rest of the page stays as it is. {% .lead %}

## Reload a few props

Say you have an orders page with the list of orders and some numbers at the top:

```ts
import { View } from 'nestjs-mvc'

@Get()
@View('Orders/Index')
index() {
  return {
    orders: () => this.orders.recent(),
    stats: () => this.orders.stats(),
  }
}
```

A "Refresh" button only needs new orders. Call `router.reload` and name the props you want in `only`:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

<button onClick={() => router.reload({ only: ['orders'] })}>Refresh</button>
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'
</script>

<template>
  <button @click="router.reload({ only: ['orders'] })">Refresh</button>
</template>
```
{% /framework-code %}

The browser asks for the same address again, and the server sends back `orders` and nothing else. The page swaps in the new orders and keeps `stats` as it was. The scroll position and anything the user typed stay where they were, too.

## Send something along

A reload can carry values with `data`. They go into the query string, so your controller reads them with `@Query()` like any other parameter:

{% framework-code %}
```tsx
const showOpen = () => router.reload({ only: ['orders'], data: { status: 'open' } })
```

```vue
<script setup lang="ts">
const showOpen = () => router.reload({ only: ['orders'], data: { status: 'open' } })
</script>
```
{% /framework-code %}

```ts
index(@Query('status') status = 'all') {
  return {
    orders: () => this.orders.recent({ status }),
    stats: () => this.orders.stats(),
  }
}
```

The address bar now shows `/orders?status=open`. That's usually what you want for a filter: a refresh or a shared link shows the same list. Anything already in the query string stays, and `data` is added on top.

When the value is only for this one request, like "send me what's newer than order 41", add `preserveUrl: true`. The address stays as it was and the browser's history doesn't grow with every reload.

## From a link

A `Link` can load only some props too. Filter tabs are a good fit: each tab is a real link with its own address, but clicking one only reloads the list.

{% framework-code %}
```tsx
import { Link } from 'nestjs-mvc/react'

<Link href="/orders?status=open" only={['orders']} preserveScroll>
  Open
</Link>
```

```vue
<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'
</script>

<template>
  <Link href="/orders?status=open" :only="['orders']" preserve-scroll>
    Open
  </Link>
</template>
```
{% /framework-code %}

Like any link, it scrolls to the top unless you ask it to {% framework name="react" %}`preserveScroll`{% /framework %}{% framework name="vue" %}`preserve-scroll`{% /framework %}.

## Your controller still runs

Every reload calls your controller method again. What gets skipped are the functions of the props nobody asked for. That's why the props above are functions: on a reload of `orders`, the query behind `stats` never runs.

So keep the work inside the prop's function. A query in the method body runs on every reload, whether its prop was asked for or not:

```ts
@Get(':id')
@View('Customers/Show')
async show(@Param('id') id: string) {
  const customer = await this.customers.find(id) // runs on every reload

  return {
    customer,
    orders: () => this.orders.forCustomer(id), // runs only when orders is needed
  }
}
```

On a reload of `orders`, the customer is still looked up, only to be left out of the answer. If that's slow, move it into a function too: `customer: () => this.customers.find(id)`. A plain value has been worked out before you return it, so it costs the same whether it's sent or not.

Props are worked out one after the other. Two slow queries in two functions take as long as both together, so if they can run side by side, start them in one function:

```ts
dashboard: async () => {
  const [orders, visits] = await Promise.all([this.orders.today(), this.visits.today()])
  return { orders, visits }
},
```

## Everything except

`except` does the opposite of `only`: it reloads every prop apart from the ones you name.

```ts
router.reload({ except: ['stats'] })
```

Be careful with it. "Every other prop" includes data you [load later](/docs/loading-data), so `optional()` and `defer()` props are fetched as well. To keep a reload small, use `only`.

## Nested props

Use dots to reach inside an object. `only: ['auth.user']` sends `user` and leaves the rest of `auth` on the page as it was:

```ts
router.reload({ only: ['auth.user'] })
```

Naming the parent, `only: ['auth']`, sends everything inside it. You can also combine the two: `only: ['auth'], except: ['auth.permissions']` sends all of `auth` apart from its permissions.

If the parent is a function, it's still called, because the server needs its result to find `user` inside it. To skip the work, make `user` a function of its own.

Your [shared data](/docs/shared-data) follows the same rules. A reload that asks for `orders` leaves `auth` out and doesn't call its functions.

## Start a list over

For a list that [grows](/docs/merging-props) with each reload, `reset` throws away what's on the page and starts again from what the server sends:

```ts
router.reload({ reset: ['messages'] })
```

`reset` counts as asking for the prop, so you don't need to name it in `only` as well.

## In detail

### What stays on the page

A prop you didn't ask for keeps the value it had. That includes an `optional()` prop you loaded earlier: it stays through later reloads that ask for something else. A normal visit to the page drops it again.

`router.reload()` with neither `only` nor `except` reloads the whole page. Every prop is sent again, optional props are dropped and deferred props are fetched again.

### When the answer is a different page

The server only leaves props out when the answer is the page you're on. If your controller answers with a different view, you get all of that view's props, whatever you put in `only`.

### Leaving while it loads

If the user moves on to another page while a reload is on its way, its answer is dropped, so it can't overwrite the page they're on now.
