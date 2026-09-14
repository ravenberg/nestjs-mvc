---
title: Introduction
---

Build full stack apps with NestJS and React. Your controllers return pages, not JSON. {% .lead %}

{% quick-links %}

{% quick-link title="Installation" icon="installation" href="/docs/installation" description="Add nestjs-mvc to a NestJS project in a few minutes." /%}

{% quick-link title="Your first page" icon="presets" href="/docs/your-first-page" description="A controller, a React component, and nothing in between." /%}

{% quick-link title="Forms and validation" icon="plugins" href="/docs/forms" description="Save data, show errors, redirect back." /%}

{% quick-link title="Authentication" icon="theming" href="/docs/authentication" description="Use your own guards. Pages react to them." /%}

{% /quick-links %}

---

## What is nestjs-mvc?

NestJS is great at the backend. For the frontend you usually build a separate app and an API between the two. That is a lot of work when one team, or one person, owns both sides.

nestjs-mvc removes the API. A controller returns the data for a page, and a React component renders it:

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

That is the whole idea. The object the controller returns is the props of the component.

## Why you might like it

* **No API to design.** No endpoints for your own frontend, no DTOs typed twice, no client side state for server data.
* **It still feels like a single page app.** Clicking a link does not reload the page. Only the new data travels.
* **It is just NestJS.** Guards, pipes, modules and dependency injection work as always.
* **One process.** In development the frontend tooling runs inside your Nest app. One command, one port.

## How to read these docs

The sidebar goes from easy to advanced:

* **Getting started** covers what every app needs: pages, links, forms and layouts.
* **Building your app** covers real world needs like logins, shared data and error pages.
* **Going further** covers performance, security and production.

You do not need to know React well, but you should know the basics of NestJS: modules, controllers and dependency injection.

{% callout title="Not official" %}
nestjs-mvc is a community project. It is not made by the NestJS team.
{% /callout %}
