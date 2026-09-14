---
title: Private history
---

The browser keeps the data of pages you visited, so the back button is instant. For private pages you can make that data unreadable after logout. {% .lead %}

## The problem

Someone checks their bank balance and logs out on a shared computer. The next person presses back. Without protection, the browser shows the balance page from its history.

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

The browser now encrypts what it stores for these pages. The key lives only for the browser session.

For all pages at once:

```ts
MvcModule.forRoot({ vite: {}, history: { encrypt: true } })
```

A single page can opt out with `@EncryptHistory(false)`.

## Clear it on logout

Encryption only helps when the key is thrown away. Do that on logout:

```ts
@Post('logout')
logout() {
  return this.view.clearHistory().redirect('/login')
}
```

If your [authentication](/docs/authentication) guard puts the user on `req.user`, you get this for free: when the logged in user changes, nestjs-mvc clears the history by itself.

After that, the back button cannot show the old pages from memory. It asks the server again, and the server decides what the visitor may see.
