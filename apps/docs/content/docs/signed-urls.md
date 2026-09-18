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

That lets you show "this link has expired" instead of a general error. Every option of `sign()` and `check()` is in the [reference](/docs/signed-url-api).

{% callout title="Anyone with the link can use it" type="warning" %}
The signature only stops people from changing a link. Anyone who has it can still read it and use it, so keep `expiresIn` short for links that give access to something.
{% /callout %}
