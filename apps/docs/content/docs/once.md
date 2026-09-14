---
title: Data the browser keeps
---

Some data rarely changes: a list of countries, the user's permissions. Send it once and let the browser keep it. {% .lead %}

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

The first visit sends the countries. On later visits the browser tells the server it already has them. The server skips the query and the browser fills in its copy. Your page does not notice the difference.

## Expire it

By default the browser keeps the data until a full page reload. Set `until` to expire it sooner, in **seconds**:

```ts
countries: once(() => this.countries.findAll(), { until: 3600 })
```

{% callout title="Seconds, not milliseconds" type="warning" %}
`until: 300` means five minutes. Writing milliseconds by mistake keeps the data for a very long time.
{% /callout %}

## Refresh it after a change

When a user adds a country, their copy is out of date. Tell nestjs-mvc to send a fresh copy on the next page:

```ts
@Post('countries')
async addCountry(@Body() dto: CreateCountryDto) {
  await this.countries.create(dto)
  return this.view.refresh('countries').back()
}
```

## Share one copy between pages

Pages that return the same data can use one key. Then a visit to one page fills the copy for the other:

```ts
countries: once(() => this.countries.findAll(), { as: 'countries' })
```

Both pages must return the same shape under that key.

## Where the copy lives

In the browser, never on the server. The server remembers nothing, so there is no cache to clear and no way for one user's data to reach another.

This also means a change by one user does not reach other users right away. They get it when their copy expires. For data that must always be current, do not use `once()`.
