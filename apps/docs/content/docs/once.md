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

The browser keeps the data until the next full page reload. To expire it sooner, set `until` in **seconds**:

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

It also means other users won't see a change right away. They get it when their copy expires, so don't use `once()` for data that always has to be current.
