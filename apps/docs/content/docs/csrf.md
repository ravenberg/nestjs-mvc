---
title: CSRF protection
---

CSRF protection is on from the start. You do not have to do anything. {% .lead %}

## What it protects against

When a user is logged in, their browser sends the login cookie with every request. A malicious website could use that to submit a form to your app in the user's name. This is called cross site request forgery, or CSRF.

nestjs-mvc blocks those requests. Every `POST`, `PUT`, `PATCH` and `DELETE` must come from your own pages.

## How it works

Two checks, both automatic:

1. **Where does the request come from?** Browsers tell the server which site sent a request. Requests from another site are refused with `403`.
2. **Does it carry the token?** Every page gets a token in a cookie. The browser code of nestjs-mvc sends it back with every request. A request without a valid token is refused with `419`.

Forms you build with `useForm`, `Link` or `router` pass both checks without any code.

## Webhooks and APIs

Some routes are not called by your pages. A payment provider posts to a webhook, a mobile app calls an API with a token. Those requests have no CSRF token. Turn the check off for them with `@SkipCsrf()`:

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

Put it on a controller for all its routes, or on a single handler.

## When a page expires

A token can become invalid, for example after you deploy with a new key. nestjs-mvc then sends the user back to the form with "This page has expired. Please try again." What they typed stays in the form, and the second try works.

## Plain HTML forms

A plain `<form method="post">` does not send the token, so it gets `419`. Use `useForm` or `Form` from `nestjs-mvc/react` instead.

## In tests

The check is off while tests run (`NODE_ENV=test`), so your supertest tests do not need tokens. To test the protection itself, turn it on:

```ts
MvcModule.forRoot({ csrf: true })
```
