---
title: Signed links
---

Some links must work without a login: an invite, an unsubscribe link, a password reset. A signed link proves it came from your app. {% .lead %}

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

The result looks like `/invitations/42?expires=1790000000&signature=...`. `expiresIn` is in seconds. Leave it out and the link never expires.

For a link in an email you need the full address. Set your app's `url` and `sign()` returns it:

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

A link that was changed or has expired gets a `403`. Your handler never runs.

## Links that work once

A password reset link should stop working after it was used. Bind it to something that changes when it is used, like the current password hash:

```ts
const link = this.links.sign(`/reset-password/${user.id}`, {
  expiresIn: 3600,
  bind: user.passwordHash,
})
```

The bound value is not in the link. Check it in the handler, because only the handler knows the current value:

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

Once the password changes, the old link no longer matches. No table of tokens to store or clean up.

## Why did it fail?

`check()` tells you why a link is refused:

```ts
const result = this.links.check(req)   // 'valid', 'expired' or 'invalid'
```

Use it to show "this link has expired" instead of a general error.

{% callout title="Signed, not secret" type="warning" %}
Anyone with the link can read it and use it. The signature only stops people from changing it. Keep `expiresIn` short for links that give access to something.
{% /callout %}
