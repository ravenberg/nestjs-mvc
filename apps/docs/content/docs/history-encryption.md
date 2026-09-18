---
title: Private history
---

The browser keeps a copy of every page's data so the back button feels instant. For pages with private data you can make those copies unreadable once someone logs out. {% .lead %}

## The problem

Every page you visit leaves a copy of its props in the browser's history for that tab. When you press back, your page renders from that copy right away, without a request to your server. That's why going back feels instant.

Logging out ends the session on your server, but the copies stay in the tab. Your API would refuse to send the balance again, but on back the browser never asks it. So say someone checks their bank balance on a shared computer and logs out. The next person presses back a few times, and the balance page shows up from its saved copy. Your guard never runs, because no request reaches your server.

Browsers can also keep a whole page in memory for the back button, and that has the same effect.

## Encrypt the history

Add `@EncryptHistory()` to the pages that show private data:

```ts
import { EncryptHistory, View } from 'nestjs-mvc'

@Controller('account')
@EncryptHistory()
export class AccountController {
  @Get()
  @View('Account/Balance')
  balance() {
    return { balance: this.accounts.balance() }
  }
}
```

The browser now encrypts the copies it keeps of these pages. The key lives in the tab's session storage, so it's gone when the tab closes.

To do this for every page at once:

```ts
MvcModule.forRoot({ vite: {}, history: { encrypt: true } })
```

A single page can opt out with `@EncryptHistory(false)`.

## Clear it on logout

On a shared computer you can't count on someone closing the tab, so throw the key away when the user logs out:

```ts
@Post('logout')
logout() {
  return this.view.clearHistory().redirect('/login')
}
```

If your [authentication](/docs/authentication) guard puts the user on `req.user`, nestjs-mvc does this for you whenever the logged in user changes.

## Pressing back after that

The copies are still in the history, but without the key they can't be read. When the next person presses back, the page notices that and asks your server for the page, like any other visit. Your guard runs and decides what they get to see, which usually means the login page.

## In detail

### Which setting wins

You can also decide in the middle of a request, from a guard or the handler:

```ts
this.view.encryptHistory()      // encrypt this page
this.view.encryptHistory(false) // or don't
```

That call wins over the decorators. After it comes `@EncryptHistory()` on the handler, then the one on its controller, then `history.encrypt` in the module options. Without any of them, nothing is encrypted.

[Error pages](/docs/error-pages) don't belong to a route, so the decorators don't apply to them. They're encrypted only by a call during the request or by the module option.

### It needs HTTPS

The browser only encrypts on HTTPS, and on `localhost` while you develop. On plain HTTP the page isn't encrypted, and the browser console says "Encryption is not supported in this environment. SSL is required." So when you test on another machine in your network, use HTTPS.

### Encrypting isn't enough on its own

The key lasts as long as the tab. If nobody throws it away when the user logs out, the next person in that tab can still go back and read everything. So encrypt and clear together.

### Clearing from the page

You can also throw the key away in the browser, for example right before a logout request:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

export function LogoutButton() {
  return <button onClick={() => { router.clearHistory(); router.post('/logout') }}>Log out</button>
}
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

function logout() {
  router.clearHistory()
  router.post('/logout')
}
</script>

<template>
  <button @click="logout">Log out</button>
</template>
```
{% /framework-code %}

### When another user logs in

The automatic clearing needs your user to have an `id`. When a page that was rendered for one user makes a request after someone else has logged in, it gets a full page reload instead of an answer, and the history key is thrown away on the way.

### What it doesn't do

This is only about the copies in the browser's history. The data still travels to the browser the normal way, so use HTTPS to protect it on the network.
