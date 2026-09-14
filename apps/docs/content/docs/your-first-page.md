---
title: Your first page
---

A page is made of a controller method that returns data and a React component that shows it. {% .lead %}

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

The name `Home` points to `frontend/pages/Home.tsx`, and the object you returned comes in as props.

```tsx
// frontend/pages/Home.tsx
export default function Home({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>
}
```

Open `http://localhost:3000` and you'll see "Hello, Ada".

## Folders

Page names can include folders, so `@View('Users/Show')` renders `frontend/pages/Users/Show.tsx`. Most apps end up with a folder per controller:

```text
frontend/pages/
  Home.tsx
  Users/
    Index.tsx
    Show.tsx
```

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

On the first visit the server sends a full HTML page with your data in it, and React takes over from there.

When someone clicks a link after that, the browser asks the same controller for just the data and swaps the page in place. You get that without writing anything extra, and the next page shows how links work.
