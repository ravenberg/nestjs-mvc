---
title: Introduction
---

Build full stack apps with NestJS and React or Vue, where your controllers return pages instead of JSON. {% .lead %}

{% quick-links %}

{% quick-link title="Installation" icon="installation" href="/docs/installation" description="Add nestjs-mvc to a NestJS project in a few minutes." /%}

{% quick-link title="Your first page" icon="presets" href="/docs/your-first-page" description="How a controller and a page component work together." /%}

{% quick-link title="Forms and validation" icon="plugins" href="/docs/forms" description="Save data, and send errors back to the form." /%}

{% quick-link title="Authentication" icon="theming" href="/docs/authentication" description="Keep your own guards and let your pages react to them." /%}

{% /quick-links %}

---

## What is nestjs-mvc?

NestJS is great for the backend. For the frontend you'd usually build a separate app with an API in between, and that's a lot of work when one team, or even one person, owns both sides.

With nestjs-mvc you skip that API. A controller returns the data for a page, and a React or Vue component renders it:

```ts
@Controller('users')
export class UsersController {
  @Get()
  @View('Users/Index')
  index() {
    return { users: [{ id: 1, name: 'Ada' }] }
  }
}
```

{% framework-code %}
```tsx
// frontend/pages/Users/Index.tsx
export default function Index({ users }: { users: { id: number; name: string }[] }) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

```vue
<!-- frontend/pages/Users/Index.vue -->
<script setup lang="ts">
defineProps<{ users: { id: number; name: string }[] }>()
</script>

<template>
  <ul>
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```
{% /framework-code %}

The object your controller returns becomes the props of the component, and that's really the whole idea.

## Why you might like it

* **You don't design an API.** Your frontend doesn't need its own endpoints, you don't type your DTOs twice, and server data doesn't need client side state.
* **It still feels like a single page app.** When you click a link, only the new data is loaded, so the page doesn't reload.
* **It's still NestJS.** Guards, pipes, modules and dependency injection work like they always have.
* **It runs in one process.** While you develop, the frontend tooling runs inside your Nest app, so you start one command on one port.

## How to read these docs

The sidebar starts easy and gets more advanced as you go down:

* **Getting started** has what every app needs, like pages, links, forms and layouts.
* **Building your app** is about things real apps need, such as logins, shared data and error pages.
* **Going further** gets into performance, security and production.

You don't have to know React or Vue well, but it helps to know the basics of NestJS, like modules, controllers and dependency injection.

{% callout title="A community project" %}
nestjs-mvc is a community project and isn't made by the NestJS team.
{% /callout %}
