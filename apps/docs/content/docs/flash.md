---
title: Flash data
---

Flash data is a value for the next page the user sees, delivered once in the page object's `flash` field and then forgotten. {% .lead %}

## Signature

`flash()` is a method of the request scoped [`ViewService`](/docs/view-service):

```ts
flash(key: string, value: unknown): this
flash(data: Record<string, unknown>): this
```

It returns the service, so you can chain it into `redirect()` or `back()`:

```ts
@Post()
async store(@Body() dto: CreateInvoiceDto) {
  const invoice = await this.invoices.create(dto)
  return this.view.flash('message', 'Invoice sent.').redirect(`/invoices/${invoice.id}`)
}
```

Calls add up: each one merges its keys into what this request flashed so far, and a later key replaces an earlier one with the same name. A value can be anything JSON can hold (strings, numbers, objects, arrays), not only a string.

The store is configured on the module:

```ts
MvcModule.forRoot({
  flash: {
    store: CookieFlashStore,       // the default
    cookie: { name: 'mvc_flash', maxAge: 300, secure: false },
  },
})
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `flash.store` | a `FlashStore` class | `CookieFlashStore` | Where the data waits between two requests. |
| `flash.cookie.name` | `string` | `'mvc_flash'` | The cookie's name. |
| `flash.cookie.maxAge` | `number` | `300` | Seconds the cookie may wait for the next request before the browser drops it. |
| `flash.cookie.secure` | `boolean` | `false` | Send the cookie over HTTPS only. Turn it on in production behind TLS. |

## When it lands

Flashed data shows up on the first page that is rendered for this browser, starting with the current request:

* **The request renders a page itself.** The data is in that render's `flash` field right away, and nothing is stored.
* **The request redirects** (with `redirect()`, `back()`, `location()` or `intended()`). The data is stored and shows up on the page the redirect leads to.
* **The request fails validation.** The data the handler flashed before it threw is stored too, next to the [validation errors](/docs/validation).

Once a page has been rendered with it, it's gone: a refresh or the next visit doesn't show it again. On the client it isn't saved in the history entry either, so the back button doesn't bring it back.

A redirect that flashes nothing leaves the stored data alone, so data survives a redirect chain. It also survives the `409` a stale asset version gets, because that answer comes before any page is rendered.

## What happens on the wire

The redirect writes the store (here the cookie):

```http
HTTP/1.1 302 Found
Location: /invoices/42
Set-Cookie: mvc_flash=…; Path=/; Max-Age=300; HttpOnly; SameSite=Lax
```

The next render puts it in the page object, next to `props`, not inside them, and clears the cookie:

```json
{
  "component": "Invoices/Show",
  "props": { "errors": {}, "invoice": { "id": 42 } },
  "url": "/invoices/42",
  "version": "a1b2c3",
  "flash": { "message": "Invoice sent." }
}
```

The `flash` field is left out when there is nothing to show.

## Where it's stored

The same store also carries [validation errors](/docs/validation), [`once()`](/docs/once-props) keys to refresh and a few page flags, all for one render.

### CookieFlashStore (default)

The browser carries the data in its own cookie, so the server keeps nothing between requests and one process can't mix up two users.

* The cookie is `HttpOnly` and `SameSite=Lax`, with `Path=/`.
* It's **signed** with the app's keys (`APP_KEY`, see [Going to production](/docs/production)). A cookie that was edited, forged or signed with a key you've since dropped is ignored, as if there were none.
* It's **not encrypted**. The value is plain JSON with a signature after it, so the user can read it in their browser's cookie storage. The data ends up in the page anyway, so only flash what this user may see.
* It's a cookie, so it has a browser's cookie size limit (a few kilobytes). Flash small values, or use the session store.

### SessionFlashStore

When your app already runs `express-session` or `@fastify/session`, keep the data in the session instead. It's stored under one key (`mvcFlash` by default), never sent to the browser, and has no size limit:

```ts
import { MvcModule, SessionFlashStore } from 'nestjs-mvc'

MvcModule.forRoot({ flash: { store: SessionFlashStore } })
```

Without a session on the request it throws, with a message that says so.

### Your own store

A store implements `FlashStore` (`read`, `write` and `clear`, each may be `async`) and is bound with `flash.store`. It's constructed with the `flash.cookie` options plus `keys`, the app's `KeyRing`. One exception: code that calls Express's `res.redirect()` directly can only carry flash data through a store that is synchronous. `ViewService.redirect()` works with any store.

## On the page

Read it from the page object:

{% framework-code %}
```tsx
import { usePage } from 'nestjs-mvc/react'

export default function Show() {
  const { flash } = usePage()

  return flash.message ? <p role="status">{String(flash.message)}</p> : null
}
```

```vue
<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'

const page = usePage()
</script>

<template>
  <p v-if="page.flash.message" role="status">{{ page.flash.message }}</p>
</template>
```
{% /framework-code %}

The client makes `flash` an empty object when the server left it out. To react to it rather than render it, pass `onFlash` in a visit's options, or listen to the router's `flash` event. Both fire only when there is something in it.

Type your keys once with `flashDataType`:

```ts
declare module '@inertiajs/core' {
  interface InertiaConfig {
    flashDataType: { message?: string; invite?: { url: string; expiresAt: string } }
  }
}
```

## Example: a one time link

Flash is a good fit for something the user must see once and that you don't want to keep, like an invitation link you just created:

```ts
@Post('invitations')
async invite(@Body() dto: InviteDto) {
  const invite = await this.invitations.create(dto)
  return this.view.flash('invite', { url: invite.url, expiresAt: invite.expiresAt }).back()
}
```

The page shows `flash.invite.url` with a copy button. After a refresh it's gone, and it was never a prop you had to leave out of other renders. With the cookie store the link sits in a readable cookie for a moment, so for a real secret prefer `SessionFlashStore`.

## Combining it with other features

* [Shared props](/docs/shared-props) are sent on every page, flash only on one. Don't share a message that should disappear.
* [Deferred props](/docs/defer) load after the page. Their requests keep the flash of the page they belong to on the client.
* An [error page](/docs/error-pages) that returns `{ redirect: 'back', flash }` flashes like a handler does.

## Pitfalls

{% callout title="Render it as text" type="warning" %}
Flash values often contain user input, like a name. Render them as text, never as HTML.
{% /callout %}

* The first rendered page takes it. If your handler flashes and then renders a page instead of redirecting, the message is shown there and the next page won't have it.
* Without `APP_KEY`, development uses a random key per process, so flash cookies don't survive a restart. Production refuses to boot without one.

## See also

* [Flash messages](/docs/flash-messages), the guide.
* [ViewService](/docs/view-service), [Validation](/docs/validation) and [Redirects](/docs/redirects).
