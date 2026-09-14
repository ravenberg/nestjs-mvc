---
title: Layouts and titles
---

Most pages share a header and a menu. Put those in a layout, once. {% .lead %}

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

The layout now stays on screen while you move between pages. It is not rebuilt on every visit, so its state survives: an open menu stays open, a playing video keeps playing.

## Nested layouts

Return more than one layout, from outside to inside:

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

`Head` also takes other tags:

```tsx
<Head>
  <title>Users</title>
  <meta name="description" content="Everyone in your team" />
</Head>
```

## The HTML around your app

nestjs-mvc renders a simple HTML page for you. To change it, for example to add a font or a favicon, pass a `template`:

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

Keep the three calls: `ctx.assets()` loads your code and styles, `ctx.head()` adds what `Head` renders on the server, and `ctx.body()` is your app.
