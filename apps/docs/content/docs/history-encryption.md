---
title: Private history
---

The browser keeps the data of pages you've visited so the back button feels instant. For private pages you can make that data unreadable after logout. {% .lead %}

## The problem

Say someone checks their bank balance on a shared computer and logs out. If the next person presses back, the browser can show the balance page straight from its history.

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

The browser now encrypts what it stores for these pages, with a key that only lasts for the browser session.

To do this for every page at once:

```ts
MvcModule.forRoot({ vite: {}, history: { encrypt: true } })
```

A single page can opt out with `@EncryptHistory(false)`.

## Clear it on logout

Encryption only helps once the key is thrown away, so do that when the user logs out:

```ts
@Post('logout')
logout() {
  return this.view.clearHistory().redirect('/login')
}
```

If your [authentication](/docs/authentication) guard puts the user on `req.user`, nestjs-mvc does this for you whenever the logged in user changes.

After that, pressing back has to ask the server again, and your server decides what the visitor gets to see.
