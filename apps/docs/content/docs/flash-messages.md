---
title: Flash messages
---

A flash message is a short message for the next page, like "Saved." It shows once and then it is gone. {% .lead %}

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

Refresh the page and the message is gone. That is the point.

## Put it in your layout

You want messages on every page, so show them once in your [layout](/docs/layouts) instead of in each page.

## More than one value

The key is up to you. Send several, or send an object:

```ts
this.view
  .flash('message', 'Invoice sent.')
  .flash('invoice', { id: 42, total: 99 })
```

## Where is it stored?

In a signed cookie in the user's browser, for a few minutes. Your server keeps nothing between requests. That matters in NestJS, because one process serves all users.

{% callout title="Show it as text" %}
Render flash messages as text, not as HTML. React does that for you unless you use `dangerouslySetInnerHTML`.
{% /callout %}
