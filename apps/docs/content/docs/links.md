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

`Link` renders a regular `<a>` tag. When someone clicks it, it gets the data for `/users` from your controller and swaps the page. The URL and the back button keep working like you'd expect.

## Links that change something

A link can also send a `POST`, `PUT`, `PATCH` or `DELETE`. Since it's really a button at that point, render it as one:

```tsx
<Link href="/logout" method="post" as="button">
  Log out
</Link>

<Link href={`/users/${user.id}`} method="delete" as="button">
  Delete
</Link>
```

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

`router.get('/users', { search })` visits `/users?search=...`, and your controller reads the value with `@Query('search')`.

With `preserveState: true`, whatever the user typed stays in the input while the page updates.

## Keep the scroll position

After a visit the page scrolls back to the top. If you'd rather stay where you are, add `preserveScroll`:

```tsx
<Link href="/users?page=2" preserveScroll>
  Next page
</Link>
```

## The current URL

`usePage` gives you the current URL, which is useful for highlighting the active menu item:

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
