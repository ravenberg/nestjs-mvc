---
title: Your first page
---

A page is made of a controller method that returns data and a {% framework name="react" %}React{% /framework %}{% framework name="vue" %}Vue{% /framework %} component that shows it. {% .lead %}

## The controller

Put `@View()` on a handler with the name of the page it should render, and return your data as a plain object.

```ts
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common'
import { View } from 'nestjs-mvc'

@Controller()
export class AppController {
  @Get()
  @View('Home')
  home() {
    return { name: 'Ada' }
  }
}
```

## The page

The name `Home` points to {% framework name="react" %}`frontend/pages/Home.tsx`{% /framework %}{% framework name="vue" %}`frontend/pages/Home.vue`{% /framework %}, and the object you returned comes in as props.

{% framework-code %}
```tsx
// frontend/pages/Home.tsx
export default function Home({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>
}
```

```vue
<!-- frontend/pages/Home.vue -->
<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <h1>Hello, {{ name }}</h1>
</template>
```
{% /framework-code %}

Open `http://localhost:3000` and you'll see "Hello, Ada".

## Folders

Page names can include folders, so `@View('Users/Show')` renders {% framework name="react" %}`frontend/pages/Users/Show.tsx`{% /framework %}{% framework name="vue" %}`frontend/pages/Users/Show.vue`{% /framework %}. Most apps end up with a folder per controller:

{% framework name="react" %}
```text
frontend/pages/
  Home.tsx
  Users/
    Index.tsx
    Show.tsx
```
{% /framework %}

{% framework name="vue" %}
```text
frontend/pages/
  Home.vue
  Users/
    Index.vue
    Show.vue
```
{% /framework %}

## Using services

It's still a normal NestJS controller, so you can inject services, read route params and use pipes like you always do.

```ts
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  @View('Users/Show')
  async show(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findOne(id)
    return { user: { id: user.id, name: user.name } }
  }
}
```

{% callout title="Only return what the page needs" type="warning" %}
Everything you return ends up in the browser. So pick the fields you want to show, rather than returning a whole database entity that might have a password hash in it.
{% /callout %}

## What happens

On the first visit the server sends a full HTML page with your data in it, and your page takes over in the browser from there.

When someone clicks a link after that, the browser asks the same controller for just the data and swaps the page in place. You get that without writing anything extra, and the next page shows how links work.

## In detail

### Props that do some work

A prop can be a function. It's called when the page renders, and a prop the browser doesn't ask for on a [reload of some props](/docs/partial-reloads) never runs its query at all:

```ts
return {
  user: { id: 1, name: 'Ada' },
  stats: () => this.stats.today(),
}
```

Plain objects and arrays are looked through all the way down, so functions work inside them too. Anything else, like an entity, a `Date` or a `Map`, is turned into JSON the way `JSON.stringify` would do it.

### Forgetting await

A promise isn't a function, so `{ user: this.users.findOne(id) }` sends an empty object instead of the user. Either `await` it, or wrap it in a function: `{ user: () => this.users.findOne(id) }`.

### What else is in the props

Next to your own data, every page gets `errors` (the validation errors for its forms) and anything you [share with every page](/docs/shared-data). Your own keys come last and win, so don't return a prop called `errors`, or the form errors are gone.

If a handler returns nothing, the page still renders, with only those.

### A typo in the page name

The server doesn't check that the page exists. When you write `@View('Users/Shw')`, you find out in the browser, with an error that says `Page "Users/Shw" not found` and the file it looked for.

### When a handler shouldn't render a page

A handler with `@View()` always renders what it returns. To do something else:

* [redirect](/docs/redirects) with `ViewService`, which stops the handler right there,
* throw an `HttpException`, like `NotFoundException`, which shows your [error page](/docs/error-pages) when you have one,
* or leave `@View()` off for a route that sends a file or plain JSON. Nest handles that route like it always does.

If you inject `@Res()` (without `passthrough: true`), you take over the response yourself, so your return value isn't used and no page is rendered.
