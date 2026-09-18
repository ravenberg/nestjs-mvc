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

A plain `<form method="post">` doesn't send the token, so it gets a `419`. Use `useForm` or `Form` from {% framework name="react" %}`nestjs-mvc/react`{% /framework %}{% framework name="vue" %}`nestjs-mvc/vue`{% /framework %} instead.

## In tests

The check is turned off while tests run (`NODE_ENV=test`), so your supertest tests don't need tokens. If you want to test the protection itself, turn it on:

```ts
MvcModule.forRoot({ csrf: true })
```

## In detail

### Reading requests are never checked

`GET`, `HEAD` and `OPTIONS` requests pass without any check, because they aren't supposed to change anything. That's also why a [signed link](/docs/signed-urls) always works. So keep changes out of your `GET` handlers: a link on another site could trigger them.

### Skipping only some handlers

When `@SkipCsrf()` is on a controller, a handler you add to it later is unprotected too. If only one or two handlers need it, put it on those. You can also switch the check back on for a single handler inside a skipped controller:

```ts
@Controller('api')
@SkipCsrf()
export class ApiController {
  @Post('orders')
  @SkipCsrf(false)
  createOrder() {} // checked again
}
```

Only skip routes that prove who's calling in their own way, like a signature or an `Authorization` header. A route that relies on the login cookie needs the check, because that cookie is exactly what a forged request carries along.

### Sending a request with fetch

If you call your app with a plain `fetch()`, the token isn't sent for you. The token lives in a cookie called `XSRF-TOKEN`, which your JavaScript can read, and the server expects the same value back in an `X-XSRF-TOKEN` header:

```ts
const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '')

await fetch('/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
  body: JSON.stringify(order),
})
```

A request like that doesn't get the "page expired" redirect. When the token is wrong, it gets a plain `419`, and a fresh token in the cookie, so retrying works.

### Other subdomains

A form on `blog.example.com` that posts to `app.example.com` is refused, even with a valid token. Serve your pages and the routes they post to from the same origin.

### After changing your key

The token is signed with your `APP_KEY`. When you [change the key](/docs/production) and keep the old one in `APP_PREVIOUS_KEYS`, tokens that browsers already have keep working. Without the old key, users get the "page expired" message once, and it works when they try again.

### Turning part of it off

The `csrf` option decides how much runs:

```ts
MvcModule.forRoot({ csrf: { token: false } }) // only check where requests come from
MvcModule.forRoot({ csrf: false })            // no protection at all
```

With `csrf: false`, the app logs a warning when it starts, because any site can then make your users submit forms. It stays off in tests too. Any other value you set explicitly also applies while tests run.
