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

The precedence rules and exactly what the browser does with the key are in the [reference](/docs/encrypt-history).
