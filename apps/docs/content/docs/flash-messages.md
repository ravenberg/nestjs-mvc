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

{% framework-code %}
```tsx
import { usePage } from 'nestjs-mvc/react'

export default function Index() {
  const { flash } = usePage()

  return (
    <>
      {flash?.message && <p className="notice">{String(flash.message)}</p>}
      {/* the rest of the page */}
    </>
  )
}
```

```vue
<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'

const page = usePage()
</script>

<template>
  <p v-if="page.flash?.message" class="notice">{{ page.flash.message }}</p>
  <!-- the rest of the page -->
</template>
```
{% /framework-code %}

`flash` is only there when a message was sent, hence the `?.`. If you refresh the page, the message is gone, which is exactly what you want.

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

It's kept for a few minutes in a signed cookie in the user's browser, so your server doesn't have to remember anything between requests. That matters in NestJS, because one process serves all your users. The stores, the signing and exactly when a message lands are in the [Flash data](/docs/flash) reference.

{% callout title="Show it as text" %}
Render flash messages as plain text. {% framework name="react" %}React already does that, as long as you don't use `dangerouslySetInnerHTML`.{% /framework %}{% framework name="vue" %}Vue's `{{ }}` already does that, as long as you don't use `v-html`.{% /framework %}
{% /callout %}
