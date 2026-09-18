---
title: Data the browser keeps
---

Some data hardly ever changes, like a list of countries. You can send it once and let the browser hold on to it. {% .lead %}

## Send it once

Wrap it in `once()`:

```ts
import { View, once } from 'nestjs-mvc'

@Get('create')
@View('Addresses/Create')
create() {
  return {
    countries: once(() => this.countries.findAll()),
  }
}
```

The first visit sends the countries. On later visits the browser lets the server know it already has them, so the server skips the query and the browser uses its own copy. Your page works the same either way.

## Expire it

The browser keeps its copy for as long as the pages you visit keep returning it. Once you go to a page without it, or reload the whole page, the copy is gone, and the next page that needs it gets a new one from the server. To expire it sooner, set `until` in **seconds**:

```ts
countries: once(() => this.countries.findAll(), { until: 3600 })
```

{% callout title="It's in seconds" type="warning" %}
`until: 300` means five minutes. If you write milliseconds by mistake, the data sticks around for a very long time.
{% /callout %}

## Refresh it after a change

When a user adds a country, their copy is out of date. You can tell nestjs-mvc to send a fresh copy with the next page:

```ts
@Post('countries')
async addCountry(@Body() dto: CreateCountryDto) {
  await this.countries.create(dto)
  return this.view.refresh('countries').back()
}
```

## Share one copy between pages

Pages that return the same data can use the same key, so visiting one page fills the copy for the other:

```ts
countries: once(() => this.countries.findAll(), { as: 'countries' })
```

Just make sure both pages return the same shape under that key.

## Where the copy lives

The copy lives in the browser. Since the server doesn't remember anything, you won't have a cache to clear, and one user's data can't reach someone else.

It also means other users won't see a change right away. They get it when their copy expires or when they move on to pages without it, so don't use `once()` for data that always has to be current.

## In detail

### Which key does the copy use?

Without `as`, the key is the name of the prop. A `once()` deeper down, for example in your [shared data](/docs/shared-data), uses its path with dots, like `auth.permissions`. That's also the key you pass to `view.refresh()`.

Two pages with the same `as` share a copy only when you go straight from one to the other. The copy moves along with each page that returns the key, and it's gone as soon as a page doesn't.

### How expiry is counted

`until` counts from the response that sent the copy. Visiting the page again doesn't extend it, so `until: 3600` really means an hour after the countries were loaded. You can also pass a `Date` for a fixed moment:

```ts
countries: once(() => this.countries.findAll(), { until: endOfDay() })
```

The server works out the moment and the browser checks it against its own clock, so a computer whose clock is far off expires its copy early or late.

### Sending it anyway

`fresh: true` makes the server send the prop even when the browser says it has it. It's handy when you work out per request whether the copy should be replaced, for example from a query parameter:

```ts
countries: once(() => this.countries.findAll(), { fresh: reload === '1' }),
```

From the page, a reload that asks for the prop always gets a new copy, so a "Reload countries" button can simply call `router.reload({ only: ['countries'] })`.

### Back, forward and full reloads

The back and forward buttons bring back a page as it was, copy included. A full page reload starts from nothing, so every `once()` prop is loaded again.

### When someone else logs in

If a different user logs in or out in the same browser, the next page they open is a full page load, so nobody sees copies that the previous user loaded.

nestjs-mvc tells users apart by the `id`, `sub` or `_id` of the user your [guard](/docs/authentication) puts on the request. If your users have none of those, say which field to use:

```ts
MvcModule.forRoot({ auth: { id: (user: User) => user.email } })
```
