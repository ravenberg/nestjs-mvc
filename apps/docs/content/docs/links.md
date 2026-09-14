---
title: Links
---

Use `Link` instead of `<a>` to move between pages without a full reload. {% .lead %}

## A link

```tsx
import { Link } from 'nestjs-mvc/react'

export default function Home() {
  return <Link href="/users">All users</Link>
}
```

`Link` renders a normal `<a>` tag. When clicked, it fetches the data for `/users` from your controller and swaps the page. The browser URL and the back button work as expected.

## Links that change something

A link can send a `POST`, `PUT`, `PATCH` or `DELETE`. Render it as a button, because that is what it is:

```tsx
<Link href="/logout" method="post" as="button">
  Log out
</Link>

<Link href={`/users/${user.id}`} method="delete" as="button">
  Delete
</Link>
```

On the server this is an ordinary route:

```ts
@Delete(':id')
async remove(@Param('id', ParseIntPipe) id: number) {
  await this.users.remove(id)
  return this.view.redirect('/users')
}
```

After a change, redirect to a page. The [redirects page](/docs/redirects) explains why.

## Navigating from code

Sometimes you navigate from a click handler or a search box. Use `router`:

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

`router.get('/users', { search })` visits `/users?search=...`. Your controller reads it with `@Query('search')`.

`preserveState: true` keeps what the user typed in the input while the page updates.

## Keep the scroll position

By default the page scrolls to the top after a visit. To stay where you are:

```tsx
<Link href="/users?page=2" preserveScroll>
  Next page
</Link>
```

## The current URL

Read the current URL with `usePage`. Useful to highlight the active menu item:

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
