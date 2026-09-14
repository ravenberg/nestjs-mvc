---
title: Flash messages
---

A flash message is a short message for the next page, like "Saved." It shows up once and then disappears. {% .lead %}

## Send one

Call `flash()` before you redirect:

```ts
@Post()
async store(@Body() dto: CreateUserDto) {
  const user = await this.users.create(dto)
  return this.view.flash('message', `${user.name} was added.`).redirect('/users')
}
```

## Show it

Read it from `usePage()` on the page you land on:

```tsx
import { usePage } from 'nestjs-mvc/react'

export default function Index() {
  const { flash } = usePage()

  return (
    <>
      {flash.message && <p className="notice">{String(flash.message)}</p>}
      {/* the rest of the page */}
    </>
  )
}
```

If you refresh the page, the message is gone, which is exactly what you want.

## Put it in your layout

You'll usually want messages on every page, so it's easier to show them once in your [layout](/docs/layouts) than in each page.

## More than one value

You pick the key, and you can send several messages or even an object:

```ts
this.view
  .flash('message', 'Invoice sent.')
  .flash('invoice', { id: 42, total: 99 })
```

## Where is it stored?

It's kept for a few minutes in a signed cookie in the user's browser, so your server doesn't have to remember anything between requests. That matters in NestJS, because one process serves all your users.

{% callout title="Show it as text" %}
Render flash messages as plain text. React already does that, as long as you don't use `dangerouslySetInnerHTML`.
{% /callout %}
