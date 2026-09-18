---
title: SignedUrls
---

`SignedUrls` makes links that carry their own proof, and checks them when they come back, without storing anything on the server. {% .lead %}

## Signature

`SignedUrls` is a provider of `MvcModule`, so you inject it anywhere:

```ts
import { SignedUrls } from 'nestjs-mvc'

class SignedUrls {
  sign(path: string, options?: SignedUrlOptions): string
  check(target: Request | string, options?: { bind?: string }): 'valid' | 'expired' | 'invalid'
  verify(target: Request | string, options?: { bind?: string }): boolean
}

interface SignedUrlOptions {
  expiresIn?: number | Date
  bind?: string
}
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `expiresIn` | `number \| Date` | none | A number is **seconds** from now; a `Date` is the moment the link stops working. Without it, the link never expires. |
| `bind` | `string` | none | A value mixed into the signature but not put in the link. `check()` must be given the same value. |

`verify()` is `check()` as a boolean: `true` only for `'valid'`.

## sign()

`sign(path, options)` takes a path, with or without a query, and returns it with an `expires` parameter (when you pass `expiresIn`) and a `signature` parameter:

```ts
this.links.sign('/invitations/7?team=acme', { expiresIn: 7 * 24 * 3600 })
// '/invitations/7?team=acme&expires=1790000000&signature=Qm9...'
```

* `expires` is a Unix timestamp in seconds, rounded down.
* `signature` is 43 characters of base64url.
* A `signature` already in `path` is dropped first, so signing a signed link again gives one signature, not two.

### Absolute links

Without the module's `url` option, `sign()` returns a path. With it, you get a full URL, which is what a link in an email needs:

```ts
MvcModule.forRoot({ url: 'https://app.example.com' })

this.links.sign('/invitations/7')
// 'https://app.example.com/invitations/7?signature=...'
```

### What the signature covers

The signature covers the path, every query parameter (including `expires`), and the `bind` value. The order of the query parameters doesn't matter, so a link still works when something reorders them.

Changing anything breaks it: another id in the path, a changed or added parameter, or an `expires` pushed forward.

The origin is **not** covered. The same link works on every domain your app answers on, and no `Host` header can change what was signed.

The signature is made with your app's keys (see [Keys](#keys) below), so a link signed by another app, or with a key you no longer have, is `'invalid'`.

## check()

`check(target, { bind })` takes the request, or a URL as a string (a path or a full URL), and returns a verdict:

| Verdict | When |
| --- | --- |
| `'valid'` | The signature matches and the link hasn't expired. |
| `'expired'` | The signature matches, but `expires` has passed. |
| `'invalid'` | There is no `signature`, or it doesn't match: the link was changed, signed elsewhere, or checked with a different `bind`. |

The signature is checked before the expiry, so a link with a changed `expires` is `'invalid'`, not `'expired'`. That makes `'expired'` safe to show as "this link has expired, ask for a new one".

```ts
@Get('invitations/:id')
@View('Invitations/Accept')
accept(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
  const verdict = this.links.check(req)
  if (verdict === 'expired') return this.view.flash('message', 'This invitation has expired.').redirect('/')
  if (verdict === 'invalid') throw new InvalidSignatureException()

  return { invitation: this.invitations.find(id) }
}
```

## @ValidSignature()

When all you need is "refuse anything that isn't valid", put `@ValidSignature()` on a handler or a controller:

```ts
import { ValidSignature } from 'nestjs-mvc'

@Get('invitations/:id')
@ValidSignature()
accept(@Param('id', ParseIntPipe) id: number) {
  return { invitation: this.invitations.find(id) }
}
```

It applies `SignedUrlGuard`, which calls `check(req)` and throws `InvalidSignatureException` for anything but `'valid'`. Your handler never runs.

`InvalidSignatureException` is a `403`. Its `verdict` property is `'expired'` or `'invalid'` (the default), and its message follows it:

```http
GET /invitations/7?expires=1690000000&signature=Qm9...

HTTP/1.1 403 Forbidden
```

```json
{ "statusCode": 403, "message": "This link has expired.", "error": "Forbidden" }
```

For `'invalid'` the message is `This link is not valid.` To show your own page for it, use [error pages](/docs/error-pages).

{% callout title="Not for bound links" type="warning" %}
The guard checks without `bind`, so a link signed with `bind` is always `'invalid'` behind `@ValidSignature()`. Check bound links in the handler, where you can work out what they were bound to.
{% /callout %}

## Links that work once

`bind` makes a link depend on something you can look up again when it's used. Bind it to state that changes when the link is used, and the link stops working after the first time:

* a password reset bound to the current password hash dies when the password changes,
* an email verification bound to the current email and its verified flag dies once it's verified,
* an invitation bound to its status dies once it's accepted.

```ts
const link = this.links.sign(`/reset-password/${user.id}`, {
  expiresIn: 3600,
  bind: user.passwordHash,
})
```

```ts
@Get('reset-password/:id')
@View('ResetPassword')
async resetForm(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
  const user = await this.users.findWithPassword(id)
  if (!user || !this.links.verify(req, { bind: user.passwordHash })) {
    return this.view.flash('message', 'This link is no longer valid.').redirect('/forgot-password')
  }
  return { email: user.email }
}
```

The bound value never appears in the link, so it can be something secret like a hash. It does need to be a string you can compute again. When it changes, the link gives `'invalid'`, the same as a link that was tampered with, because the server can't tell the two apart. There's no table of tokens to store and clean up.

Check the handler that *uses* the link (the `POST` that sets the new password) the same way, and make that request carry the link's query, for example by posting the form to the signed URL.

## Links you share by hand

Not every link goes out in an email. An invitation link that someone copies into a chat, or a download link pasted into a ticket, works the same way, with two things to keep in mind:

* **Anyone who has it can use it.** A signature stops people from changing a link, not from forwarding it. Give links that grant access a short `expiresIn`, and bind them to state you can revoke.
* **Make it absolute** with the module's `url` option, so the pasted link points at your app and not at a relative path.

```ts
linkFor(invitation: Invitation) {
  return this.links.sign(`/invitations/${invitation.id}`, {
    expiresIn: 7 * 24 * 3600,
    bind: `${invitation.status}:${invitation.updatedAt.toISOString()}`,
  })
}
```

Binding to the invitation's status means the link stops working once it's accepted or revoked, and "copy a new link" after a revoke gives a fresh one.

## Keys

Everything nestjs-mvc signs uses one key ring: signed links, the CSRF token, the flash cookie, and the intended URL cookie.

The keys come from the `keys` module option, or from the environment when you leave it out:

```ts
MvcModule.forRoot({ keys: [process.env.APP_KEY, process.env.APP_PREVIOUS_KEY] })
```

* Without `keys`, nestjs-mvc reads `APP_KEY` plus the comma separated `APP_PREVIOUS_KEYS`.
* `undefined` and empty entries are skipped.
* Each key must be at least 32 characters (`MIN_KEY_LENGTH`), or the app refuses to boot. Generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

* In production, the app refuses to boot without a key. Elsewhere, it uses a random key for the process (with a warning outside tests), so everything signed with it stops working after a restart, signed links included.

The first key signs. Each purpose (links, CSRF, flash) derives its own subkey, so a value signed for one purpose never passes as another. `createKeyRing(keys, env)` builds the ring the same way the module does, if you need one outside it.

## Combining it with other features

* **Flash data.** Redirect with a message when `check()` says `'expired'`, as in the example above. See [flash data](/docs/flash).
* **Error pages.** `InvalidSignatureException` is a normal `403`, so `errorPages` can render it. See [error pages](/docs/error-pages).
* **CSRF.** A signed link is a `GET`, so the CSRF check never gets in its way. See [@SkipCsrf()](/docs/skip-csrf).

## Pitfalls

{% callout title="expiresIn is in seconds" type="warning" %}
`expiresIn: 3600` is one hour. A number in milliseconds makes a link that lasts about a thousand times longer than you meant.
{% /callout %}

* A link without `expiresIn` never expires. Only leave it out for links that are safe forever, like an unsubscribe link bound to nothing sensitive.
* Adding a query parameter to a signed link (a tracking parameter, say) breaks the signature. Add it before you sign.
* The origin isn't signed, so don't rely on the domain in a link to mean anything.

## See also

* [Signed links](/docs/signed-urls), the guide.
* [Login redirects](/docs/login-redirects) for the intended URL, which is signed with the same keys.
* [@SkipCsrf()](/docs/skip-csrf) for the CSRF token.
