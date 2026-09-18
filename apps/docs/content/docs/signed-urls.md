---
title: Signed links
---

Some links have to work without a login, like an invite or a password reset. A signed link proves that it came from your app. {% .lead %}

## Make a link

Inject `SignedUrls` and sign a path:

```ts
import { SignedUrls } from 'nestjs-mvc'

@Injectable()
export class InvitationsService {
  constructor(private readonly links: SignedUrls) {}

  linkFor(invitation: Invitation) {
    return this.links.sign(`/invitations/${invitation.id}`, { expiresIn: 7 * 24 * 3600 })
  }
}
```

You get something like `/invitations/42?expires=1790000000&signature=...`. `expiresIn` is in seconds, and if you leave it out the link never expires.

A link in an email needs the full address. Set your app's `url` and `sign()` gives you that:

```ts
MvcModule.forRoot({ vite: {}, url: 'https://app.example.com' })
```

## Check a link

Add `@ValidSignature()` to the route:

```ts
import { ValidSignature, View } from 'nestjs-mvc'

@Controller('invitations')
export class InvitationsController {
  @Get(':id')
  @View('Invitations/Accept')
  @ValidSignature()
  accept(@Param('id', ParseIntPipe) id: number) {
    return { invitation: this.invitations.find(id) }
  }
}
```

If someone changed the link or it has expired, they get a `403` and your handler never runs.

## Links that work once

A password reset link should stop working once it's been used. You do that by binding it to something that changes when it's used, like the current password hash:

```ts
const link = this.links.sign(`/reset-password/${user.id}`, {
  expiresIn: 3600,
  bind: user.passwordHash,
})
```

The bound value isn't part of the link. You check it in the handler, since that's where you know the current value:

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

As soon as the password changes, the old link stops matching, and you don't need a table of tokens to store and clean up.

## Why did it fail?

`check()` tells you why a link is refused:

```ts
const result = this.links.check(req)   // 'valid', 'expired' or 'invalid'
```

That lets you show "this link has expired" instead of a general error.

{% callout title="Anyone with the link can use it" type="warning" %}
The signature only stops people from changing a link. Anyone who has it can still read it and use it, so keep `expiresIn` short for links that give access to something.
{% /callout %}

## In detail

### What the signature covers

The signature covers the path and every query parameter, `expires` included. Changing any of it breaks the link: another id, an extra parameter, or an expiry pushed a week further. The order of the parameters doesn't matter, so a link still works when something reorders them on the way.

That also means a parameter added afterwards, like a tracking code from your newsletter tool, breaks the link. Add those to the path before you sign it.

The domain isn't part of the signature, so the same link works on every domain your app answers on.

### Expired or tampered with?

`check()` only says `'expired'` when the signature is right. A link where someone moved the expiry forward is `'invalid'`. So "This link has expired, ask for a new one" is always safe to show for `'expired'`.

A bound link whose value has changed is `'invalid'` too, since the server can't tell that apart from a link someone tampered with.

`check()` and `verify()` also take a URL as a string, for example to check a link someone pasted into a form.

### @ValidSignature() and bound links

`@ValidSignature()` checks without a bound value, so a link signed with `bind` never gets past it. Check bound links in the handler, like the password reset above.

When it does refuse a link, the `403` comes with the message "This link has expired" or "This link is not valid". To show your own page instead, use [error pages](/docs/error-pages).

### Check the form that uses the link too

A password reset has two steps: the page with the form, and the `POST` that saves the new password. Check the signature in both. The easiest way is to post the form to the signed URL itself, so the `POST` carries the same `expires` and `signature`.

### More things to bind to

Anything you can look up again when the link is used works, as long as it changes once the link has done its job:

* an email verification link, bound to the current email and whether it's verified,
* an invitation, bound to its status, so the link dies once it's accepted or revoked.

```ts
this.links.sign(`/invitations/${invitation.id}`, {
  expiresIn: 7 * 24 * 3600,
  bind: `${invitation.status}:${invitation.updatedAt.toISOString()}`,
})
```

The bound value never shows up in the link, so it can be something secret, like a password hash.

### A fixed moment instead of seconds

`expiresIn` also takes a `Date`, for a link that should stop working at a set time:

```ts
this.links.sign('/early-bird', { expiresIn: new Date('2026-12-31T23:59:59Z') })
```

### Links and restarts

Links are signed with your `APP_KEY`. In development without one, the app makes up a new key every time it starts, so links you made before a restart stop working. See [Going to production](/docs/production) for setting a key.
