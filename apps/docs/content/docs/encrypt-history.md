---
title: History encryption
---

History encryption makes the browser store a page's data in its history encrypted, with a key that you can throw away on logout, so the back button can't show private data to the next person at the computer. {% .lead %}

## Signature

```ts
import { EncryptHistory } from 'nestjs-mvc'

// Per route or controller
EncryptHistory(enabled = true): MethodDecorator & ClassDecorator

// Per request, on ViewService
encryptHistory(enabled = true): this
clearHistory(): this

// Module default
MvcModule.forRoot({ history: { encrypt: true } })
```

| API | Default | Meaning |
| --- | --- | --- |
| `@EncryptHistory()` | `enabled = true` | Encrypt the pages this handler (or every handler of this controller) renders. `@EncryptHistory(false)` opts out. |
| `view.encryptHistory()` | `enabled = true` | Decide for this request only. `encryptHistory(false)` opts out. |
| `history.encrypt` | `false` | Encrypt every page unless something above says otherwise. |
| `view.clearHistory()` | | Tell the client to drop its encryption key, on this render or the next one after a redirect. |

## Precedence

For each render, the first of these that is set wins:

1. `view.encryptHistory()` during the request
2. `@EncryptHistory()` on the handler, else on its controller
3. `history.encrypt` in the module options
4. off

```ts
@Controller('account')
@EncryptHistory()
export class AccountController {
  @Get()
  @View('Account/Balance')
  balance() { /* encrypted */ }

  @Get('help')
  @View('Account/Help')
  @EncryptHistory(false)
  help() { /* not encrypted */ }
}
```

[Error pages](/docs/error-pages) aren't rendered for a route, so the decorator doesn't apply to them; they follow the runtime call and the module default.

## What happens on the wire

Both flags are booleans on the page object, and they're only sent when `true`:

```json
{
  "component": "Account/Balance",
  "props": { "errors": {}, "balance": 1250 },
  "url": "/account",
  "version": "a1b2c3",
  "encryptHistory": true,
  "clearHistory": true
}
```

They're on the page object of a first load too, not only on Inertia visits. There are no headers involved.

## What the client does

### encryptHistory

Each time the client saves a page to the tab's history (`pushState` or `replaceState`), it checks the page's `encryptHistory`. When it's `true`, the page is encrypted with AES-GCM before it's stored. The key is a 256 bit key the client generates on first use and keeps, together with the IV, in the tab's `sessionStorage` (`historyKey` and `historyIv`). Closing the tab loses it.

When the user goes back or forward to an encrypted entry, the client decrypts it with that key and renders it, without a request.

### clearHistory

When a page arrives with `clearHistory: true`, the client removes `historyKey` and `historyIv` from `sessionStorage` before it saves the new page. The next encrypted page gets a new key.

Entries encrypted with the old key are still in the history, but they can't be decrypted anymore. When the user goes back to one, the decrypt fails, and the client visits the current URL instead, as a normal Inertia visit. Your guards run and decide what they see. The same check runs when the browser restores a page from its back/forward cache.

You can also clear from the page, with `router.clearHistory()`:

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

## When clearHistory() lands

`clearHistory()` goes into the same pending bag as flash data:

* When the request renders a page, that page gets `clearHistory: true`.
* When it redirects through `ViewService`, the flag is stored in the flash cookie and lands on the page the redirect leads to. After that it's gone.

```ts
@Post('logout')
async logout(@Req() req: Request) {
  await this.auth.signOut(req)
  return this.view.clearHistory().redirect('/login')
}
```

## Clearing without asking

You often don't need to call `clearHistory()` yourself. When your guards put the user on `request.user` and the user has an id, nestjs-mvc notices when the logged in user changes:

* On an Inertia request from a page that was rendered for someone else, the client gets one full page load (a `409` with `X-Inertia-Location`), and the page it loads has `clearHistory: true`.
* On a first load for a different user than this browser saw last (a full page login, an OAuth callback), the page gets `clearHistory: true`.

[Login redirects](/docs/login-redirects) covers how the user is told apart.

## Pitfalls

{% callout title="Encryption needs a secure context" type="warning" %}
The client uses the browser's Web Crypto API, which only exists on HTTPS (and on `localhost`). On plain HTTP it logs "Encryption is not supported in this environment. SSL is required." and the page can't be encrypted. Test encrypted pages over HTTPS or on `localhost`.
{% /callout %}

* **Encryption without clearing protects little.** The key lives as long as the tab. If nobody clears it on logout, the next person on the same tab can still go back.
* **It's about the browser's history, not the network.** The props travel as usual; use HTTPS for that.

## See also

* [Private history](/docs/history-encryption), the guide.
* [ViewService](/docs/view-service), for `encryptHistory()` and `clearHistory()`.
* [Authentication](/docs/authentication) and [Login redirects](/docs/login-redirects).
