---
title: Lazy props
---

Any prop can be a function instead of a value. nestjs-mvc calls it only when the prop goes into the response, so work for data the page doesn't need right now never runs. {% .lead %}

## Usage

Return a closure where you would return a value. It can be sync or async:

```ts
import { View } from 'nestjs-mvc'

@Get(':id')
@View('Projects/Show')
show(@Param('id', ParseIntPipe) id: number) {
  return {
    project: () => this.projects.find(id),
    members: async () => this.members.forProject(id),
    title: 'Project',
  }
}
```

There is no helper to import. The rule is simply: a prop value that is a function gets called, and the value it returns (or the value its promise resolves to) is what the page receives. The same goes for every value in a plain object or array, at any depth.

## When the closure runs

| Response | Does the closure run? |
|---|---|
| First load (the HTML page) | Yes |
| Inertia visit (clicking a `Link`, `router.get`, a redirect) | Yes |
| Partial reload that asks for the prop | Yes |
| Partial reload that asks for a parent or child path of the prop | Yes |
| Partial reload that doesn't ask for it, or lists it in `except` | No |

So on a normal page load a closure costs the same as a plain value. It pays off on [partial reloads](/docs/partial-reloads): when the browser reloads `only: ['members']`, `project` is never called.

{% callout title="The handler still runs" %}
A partial reload calls your controller method like any other request. Only the closures are skipped. Code in the handler body itself, such as `const project = await this.projects.find(id)`, runs every time. Move the work into the closure to make it lazy.
{% /callout %}

## Nesting

Closures work inside plain objects and arrays, and the value a closure returns is walked too:

```ts
return {
  auth: () => ({
    user: this.users.current(),
    teams: () => this.teams.forCurrentUser(),
  }),
}
```

Paths use dots, the same way the client names them. A partial reload asking for `auth.teams` calls `auth` (it has to, to find `teams`) and then `teams`, and sends only `{ auth: { teams: [...] } }`. A reload asking for something else calls neither.

Special props like `optional()`, `defer()` and `merge()` work at any depth as well, and are reported by their dot path (`auth.notifications`).

Only plain objects (`{}` or `Object.create(null)`) and arrays are walked. Class instances such as ORM entities, `Date` or `Map` are sent as they are, and nothing inside them is called.

## Order and timing

Props resolve one at a time, in the order of their keys, depth first. An async closure is awaited before the next prop starts, so two slow queries in two closures take as long as both added together. If they can run side by side, start them in one closure:

```ts
dashboard: async () => {
  const [orders, visits] = await Promise.all([this.orders.today(), this.visits.today()])
  return { orders, visits }
},
```

Your handler's props are resolved together with the shared props and the `errors` prop that nestjs-mvc adds, so shared closures are lazy in exactly the same way.

## Errors

If a closure throws, the whole response fails, like any exception in your handler. The one exception is `defer(fn, { rescue: true })`, which leaves the failing prop out instead. See [defer()](/docs/defer#rescue).

## How it differs from the helpers

A closure only decides *whether work runs*. The helpers also decide *when the prop is sent*:

| | First load and visits | Partial reload that doesn't ask for it | Partial reload that asks for it |
|---|---|---|---|
| Closure | Sent | Left out, not called | Sent |
| [`optional()`](/docs/optional) | Left out, not called | Left out, not called | Sent |
| [`defer()`](/docs/defer) | Left out, fetched by the client right after | Left out, not called | Sent |
| [`always()`](/docs/always) | Sent | Sent | Sent |

Use a plain closure for data the page needs from the start. Use `optional()` or `defer()` when it can arrive later.

## Pitfalls

{% callout title="A closure that returns a function" type="warning" %}
The value a closure returns isn't called again. If it returns another function, that function ends up in the JSON, where it disappears, and the prop is missing on the page.
{% /callout %}

{% callout title="Don't wrap a helper in a closure" type="warning" %}
Return helpers directly (`stats: defer(fn)`), or inside a plain object. A closure or helper whose value is itself a helper (`() => defer(fn)`, `merge(defer(fn))`) sends the helper object instead of its data.
{% /callout %}

## See also

- [Loading data later](/docs/loading-data), the guide
- [Partial reloads](/docs/partial-reloads)
- [optional()](/docs/optional), [defer()](/docs/defer), [always()](/docs/always)
