---
title: Your first page
---

A page is two things: a controller method that returns data, and a React component that shows it. {% .lead %}

## The controller

Put `@View()` on a handler and name the page it renders. Return the data as a plain object.

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

The name `Home` points to `frontend/pages/Home.tsx`. The object you returned arrives as props.

```tsx
// frontend/pages/Home.tsx
export default function Home({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>
}
```

Open `http://localhost:3000`. You see "Hello, Ada".

## Folders

Page names can have folders. `@View('Users/Show')` renders `frontend/pages/Users/Show.tsx`. A common pattern is one folder per controller:

```text
frontend/pages/
  Home.tsx
  Users/
    Index.tsx
    Show.tsx
```

## Using services

The controller is a normal NestJS controller. Inject services, read route params, use pipes.

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
Everything you return ends up in the browser. Do not return a whole database entity with a password hash in it. Pick the fields you want to show.
{% /callout %}

## What happens

On the first visit, the server sends a full HTML page with your data inside. React takes over in the browser.

After that, clicking a link does not load a new HTML page. The browser asks the same controller for the data only, and swaps the page. You write nothing extra for this. The next page shows how links work.
