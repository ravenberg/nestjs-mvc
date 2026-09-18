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

When no message was sent, `flash` is empty and nothing shows. If you refresh the page, the message is gone, which is exactly what you want.

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
Render flash messages as plain text. {% framework name="react" %}React already does that, as long as you don't use `dangerouslySetInnerHTML`.{% /framework %}{% framework name="vue" %}Vue's `{{ }}` already does that, as long as you don't use `v-html`.{% /framework %}
{% /callout %}

## In detail

### Flashing more than once

Each call adds its keys to what you flashed so far in this request, and a later value for the same key replaces the earlier one. A value can be anything that fits in JSON: a string, a number, an object or a list.

### When does it show up?

On the first page that's rendered for that browser, and that doesn't have to be the next request:

* If your handler flashes and then renders a page instead of redirecting, the message shows on that page right away, and the page after it won't have it.
* A redirect that flashes nothing leaves the message alone, so it survives a chain of redirects.
* If validation fails after you flashed, the message travels back to the form together with the errors.

The back button doesn't bring it back either.

### Reacting to a message

Sometimes you want to do something with a message rather than show it, like open a dialog. Pass `onFlash` in the options of a visit, as in `form.post('/invoices', { onFlash: (flash) => ... })`. It's only called when there is something in `flash`.

### The cookie

By default the message waits in a cookie for up to five minutes. You can change that on the module:

```ts
MvcModule.forRoot({
  flash: { cookie: { name: 'mvc_flash', maxAge: 300, secure: true } },
})
```

`maxAge` is in seconds. Turn `secure` on in production, so the cookie only travels over HTTPS.

The cookie is signed with your app's key, so nobody can change it or make one up. It isn't encrypted though: the user can read it in their browser, so only flash what this user may see. It's also small, a few kilobytes at most.

In development without an `APP_KEY`, a new key is made each time the app starts, so a message doesn't survive a restart. See [Going to production](/docs/production).

### Keeping it on the server instead

If your app already runs `express-session` or `@fastify/session`, you can keep flash data in the session. It never reaches the browser and has no size limit, which suits something secret like a one time invitation link:

```ts
import { MvcModule, SessionFlashStore } from 'nestjs-mvc'

MvcModule.forRoot({ flash: { store: SessionFlashStore } })
```
