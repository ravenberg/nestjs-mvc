---
title: Layouts and titles
---

Most pages share a header and a menu, so you put those in a layout once. {% .lead %}

## A layout component

A layout is a normal React component that wraps the page:

```tsx
// frontend/layouts/AppLayout.tsx
import { Link } from 'nestjs-mvc/react'
import type { ReactNode } from 'react'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/users">Users</Link>
      </nav>
      <main>{children}</main>
    </>
  )
}
```

## Attach it to a page

Set `layout` on the page component:

```tsx
// frontend/pages/Users/Index.tsx
import type { ReactNode } from 'react'
import { AppLayout } from '../../layouts/AppLayout'

export default function Index() {
  return <h1>Users</h1>
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
```

The layout now stays on screen while you move between pages. Because it isn't rebuilt on every visit, it keeps its state, so an open menu stays open and a video keeps playing.

## Nested layouts

You can wrap a page in more than one layout, from the outside in:

```tsx
Settings.layout = (page: ReactNode) => (
  <AppLayout>
    <SettingsLayout>{page}</SettingsLayout>
  </AppLayout>
)
```

## The page title

Use `Head` to set the title of the browser tab:

```tsx
import { Head } from 'nestjs-mvc/react'

export default function Index() {
  return (
    <>
      <Head title="Users" />
      <h1>Users</h1>
    </>
  )
}
```

You can put other tags in `Head` too:

```tsx
<Head>
  <title>Users</title>
  <meta name="description" content="Everyone in your team" />
</Head>
```

## The HTML around your app

nestjs-mvc renders a basic HTML page around your app. If you want to change it, say to add a font or a favicon, pass a `template`:

```ts
// src/template.ts
import type { PageObject, TemplateContext } from 'nestjs-mvc'

export function template(page: PageObject, ctx: TemplateContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  ${ctx.assets()}
  ${ctx.head()}
</head>
<body>${ctx.body()}</body>
</html>`
}
```

```ts
MvcModule.forRoot({ vite: {}, template })
```

Make sure you keep the three calls. `ctx.assets()` loads your code and styles, `ctx.head()` adds what `Head` renders on the server, and `ctx.body()` is your app.
