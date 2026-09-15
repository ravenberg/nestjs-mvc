---
title: Links
---

Use `Link` instead of `<a>` to move between pages without a full reload. {% .lead %}

## A link

{% framework-code %}
```tsx
import { Link } from 'nestjs-mvc/react'

export default function Home() {
  return <Link href="/users">All users</Link>
}
```

```vue
<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'
</script>

<template>
  <Link href="/users">All users</Link>
</template>
```
{% /framework-code %}

`Link` renders a regular `<a>` tag. When someone clicks it, it gets the data for `/users` from your controller and swaps the page. The URL and the back button keep working like you'd expect.

## Links that change something

A link can also send a `POST`, `PUT`, `PATCH` or `DELETE`. Since it's really a button at that point, render it as one:

{% framework-code %}
```tsx
<Link href="/logout" method="post" as="button">
  Log out
</Link>

<Link href={`/users/${user.id}`} method="delete" as="button">
  Delete
</Link>
```

```vue
<Link href="/logout" method="post" as="button">
  Log out
</Link>

<Link :href="`/users/${user.id}`" method="delete" as="button">
  Delete
</Link>
```
{% /framework-code %}

On the server it's a regular route:

```ts
@Delete(':id')
async remove(@Param('id', ParseIntPipe) id: number) {
  await this.users.remove(id)
  return this.view.redirect('/users')
}
```

After you change something, redirect to a page. The [redirects page](/docs/redirects) explains why.

## Navigating from code

Sometimes you want to navigate from a click handler or a search box. That's what `router` is for:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

function Search() {
  return (
    <input
      placeholder="Search"
      onChange={(e) => router.get('/users', { search: e.target.value }, { preserveState: true })}
    />
  )
}
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

function search(event: Event) {
  const value = (event.target as HTMLInputElement).value
  router.get('/users', { search: value }, { preserveState: true })
}
</script>

<template>
  <input placeholder="Search" @input="search" />
</template>
```
{% /framework-code %}

`router.get('/users', { search })` visits `/users?search=...`, and your controller reads the value with `@Query('search')`.

With `preserveState: true`, whatever the user typed stays in the input while the page updates.

## Keep the scroll position

After a visit the page scrolls back to the top. If you'd rather stay where you are, add {% framework name="react" %}`preserveScroll`{% /framework %}{% framework name="vue" %}`preserve-scroll`{% /framework %}:

{% framework-code %}
```tsx
<Link href="/users?page=2" preserveScroll>
  Next page
</Link>
```

```vue
<Link href="/users?page=2" preserve-scroll>
  Next page
</Link>
```
{% /framework-code %}

## The current URL

`usePage` gives you the current URL, which is useful for highlighting the active menu item:

{% framework-code %}
```tsx
import { Link, usePage } from 'nestjs-mvc/react'

function Menu() {
  const { url } = usePage()

  return (
    <Link href="/users" className={url.startsWith('/users') ? 'active' : ''}>
      Users
    </Link>
  )
}
```

```vue
<script setup lang="ts">
import { Link, usePage } from 'nestjs-mvc/vue'

const page = usePage()
</script>

<template>
  <Link href="/users" :class="{ active: page.url.startsWith('/users') }">
    Users
  </Link>
</template>
```
{% /framework-code %}
