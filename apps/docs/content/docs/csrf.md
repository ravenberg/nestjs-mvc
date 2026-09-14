---
title: CSRF protection
---

CSRF protection is switched on from the start, so there's nothing you need to set up. {% .lead %}

## What it protects against

When someone is logged in, their browser sends the login cookie along with every request. A malicious website could abuse that to submit a form to your app in their name, and that's called cross site request forgery, or CSRF.

nestjs-mvc blocks those requests by making sure every `POST`, `PUT`, `PATCH` and `DELETE` comes from your own pages.

## How it works

It does two checks, and both happen on their own:

1. **Where does the request come from?** Browsers tell the server which site sent a request, and anything from another site gets a `403`.
2. **Does it carry the token?** Every page gets a token in a cookie, and nestjs-mvc's browser code sends it back with each request. Without a valid token the request gets a `419`.

Anything you send with `useForm`, `Link` or `router` passes both checks without extra code.

## Webhooks and APIs

Some routes get called from outside your pages, like a webhook from a payment provider or an API that a mobile app calls with its own token. Those requests don't have a CSRF token, so turn the check off for them with `@SkipCsrf()`:

```ts
import { SkipCsrf } from 'nestjs-mvc'

@Controller('webhooks')
@SkipCsrf()
export class WebhooksController {
  @Post('payments')
  handlePayment(@Body() event: PaymentEvent) {
    // Verify the provider's signature here instead.
  }
}
```

You can put it on a whole controller or on a single handler.

## When a page expires

A token can stop being valid, for example after you deploy with a new key. When that happens, nestjs-mvc sends the user back to the form with the message "This page has expired. Please try again." What they typed is still in the form, and trying again works.

## Plain HTML forms

A plain `<form method="post">` doesn't send the token, so it gets a `419`. Use `useForm` or `Form` from `nestjs-mvc/react` instead.

## In tests

The check is turned off while tests run (`NODE_ENV=test`), so your supertest tests don't need tokens. If you want to test the protection itself, turn it on:

```ts
MvcModule.forRoot({ csrf: true })
```
