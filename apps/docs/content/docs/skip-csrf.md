---
title: "@SkipCsrf()"
---

CSRF protection runs on every route unless you turn it off. `@SkipCsrf()` turns it off for one handler or a whole controller, for requests that don't come from your pages. {% .lead %}

## Signature

```ts
import { SkipCsrf } from 'nestjs-mvc'

SkipCsrf(skip = true): MethodDecorator & ClassDecorator
```

Put it on a controller to skip every handler in it, or on a single handler. The handler wins over the controller, so `@SkipCsrf(false)` on a handler turns protection back on inside a skipped controller:

```ts
@Controller('api')
@SkipCsrf()
export class ApiController {
  @Post('open')
  open() {}              // not protected

  @Post('guarded')
  @SkipCsrf(false)
  guarded() {}           // protected again
}
```

The protection itself is set with the `csrf` option of `MvcModule.forRoot()`:

| Value | Origin check | Token check |
| --- | --- | --- |
| left out | on | on (off under `NODE_ENV=test`, see below) |
| `true` | on | on |
| `{ token: true }` | on | on |
| `{ token: false }` | on | off, and no `XSRF-TOKEN` cookie is set |
| `false` | off | off |

With `csrf: false`, nestjs-mvc logs a warning at boot (outside tests), because any site can then make your users submit forms. The exported `csrfSettings(option, env)` turns this option into what the guard uses: `{ token: boolean }`, or `undefined` when protection is off.

## How the protection works

A guard, `CsrfGuard`, is registered for every route by `MvcModule`. It's a guard rather than a middleware so it can read `@SkipCsrf()`, and so Precognition's validate only requests are checked too. It keeps nothing on the server.

`GET`, `HEAD` and `OPTIONS` must not change anything, so they pass. Every other method goes through two checks.

### 1. Where the request comes from

The browser says which site sent the request:

* With a `Sec-Fetch-Site` header, only `same-origin` and `none` pass. `cross-site` and `same-site` are refused, so a subdomain can't post to your app either.
* A browser too old to send `Sec-Fetch-Site` is checked on `Origin`, which must equal your app's origin (the module's `url` option, or the request's own protocol and host). `Origin: null` is refused.
* With neither header, the request doesn't come from a browser, and the token check decides.

A refused request throws `CrossSiteRequestException`, a `403` with the message `Cross-site request refused.`

### 2. The token

Every response to a safe request that has no valid token cookie sets one:

```http
Set-Cookie: XSRF-TOKEN=<random value>.<signature>; Path=/; SameSite=Lax
```

The value is 32 random bytes, signed with your app's keys. The cookie is readable by JavaScript (not `HttpOnly`), `Secure` when the app is served over https, and has no `Max-Age`, so it lasts until the browser closes. It proves where the request comes from, not who you are.

Inertia's HTTP client reads the `XSRF-TOKEN` cookie and copies it into an `X-XSRF-TOKEN` header on every request it makes. That covers `router`, `Link`, `useForm`, `Form` and `useHttp`, so you don't write any code for it.

A request that changes something passes when:

* the `X-XSRF-TOKEN` header equals the `XSRF-TOKEN` cookie, and
* the cookie carries a valid signature from one of your keys.

Otherwise it throws `CsrfTokenMismatchException`, and the same response sets a fresh token, so trying again works:

```http
POST /save
X-XSRF-TOKEN: <old token>

HTTP/1.1 419
Set-Cookie: XSRF-TOKEN=<new token>; Path=/; SameSite=Lax
```

```json
{ "statusCode": 419, "message": "CSRF token mismatch.", "error": "Page Expired" }
```

A token signed with a previous key still passes, as long as that key is still in your `keys` (see [SignedUrls](/docs/signed-url-api) for the key ring).

## The page expired flash

On an Inertia visit (not a Precognition request), the `419` isn't shown as an error. nestjs-mvc sends the visitor back to the page they were on (the `Referer`, or `/`) with:

* the flash message `This page has expired. Please try again.` under `message` (exported as `PAGE_EXPIRED_MESSAGE`),
* the same text as a form level error under `_form`, in the form's error bag when it named one.

Because there is an error, the client runs `onError` instead of `onSuccess`, and the form keeps what the user typed. The fresh token is already in the cookie, so submitting again works.

A request that isn't an Inertia visit, like `useHttp` or `fetch`, gets the plain `419` JSON above.

## What @SkipCsrf() turns off

On a skipped handler the guard returns straight away, so:

* the origin check doesn't run,
* the token check doesn't run,
* a `GET` on that route doesn't hand out an `XSRF-TOKEN` cookie.

Nothing else changes. Your own guards, pipes and interceptors run as usual.

## When to use it

Skip the check on routes that are called from outside your pages and prove who they are some other way:

* **Webhooks** from a payment provider or another service. Verify the provider's signature in the handler instead.
* **Bearer token APIs** that a mobile app or another server calls with an `Authorization` header. A browser never adds that header on its own, so another site can't forge it.

```ts
@Controller('webhooks')
@SkipCsrf()
export class WebhooksController {
  @Post('payments')
  handlePayment(@Headers('stripe-signature') signature: string, @Body() event: unknown) {
    // Check the provider's signature before trusting the event.
  }
}
```

Don't skip it on a route that relies on a login cookie. Cookies are exactly what the browser sends along with a forged request.

## In tests

When you leave the `csrf` option out, protection is off while `NODE_ENV` is `test`, so a supertest suite can post without tokens. Setting it explicitly (`true` or `{ … }`) turns it on there too, which is how you test the protection itself:

```ts
MvcModule.forRoot({ csrf: true })
```

`csrf: false` stays off everywhere.

## Combining it with other features

* **Precognition.** A validate only request needs the token like any other, and gets a plain `419` rather than the redirect. See [Precognition](/docs/precognition).
* **Error pages.** `errorPages` runs before the page expired redirect. If it returns something for `419`, that wins. See [error pages](/docs/error-pages).
* **Flash data.** The page expired message is ordinary flash data, so it shows wherever you show flash messages. See [flash data](/docs/flash).
* **Signed URLs.** A signed link is a `GET`, so it never needs `@SkipCsrf()`. See [SignedUrls](/docs/signed-url-api).

## Pitfalls

{% callout title="Plain HTML forms get a 419" type="warning" %}
A `<form method="post">` submitted by the browser itself doesn't send `X-XSRF-TOKEN`. Submit it through Inertia's `useForm` or `Form` instead, or it fails the token check.
{% /callout %}

* `fetch()` doesn't copy the cookie into the header. Use `useHttp`, or read `XSRF-TOKEN` and set `X-XSRF-TOKEN` yourself.
* A request with an `Origin` from another subdomain is refused even with a valid token. Serve the pages and the form endpoints from the same origin.
* If `@SkipCsrf()` is on the controller, a new handler added later is unprotected too. Put it on the handlers when only some of them need it.

## See also

* [CSRF protection](/docs/csrf), the guide.
* [Forms](/docs/forms) for sending forms with the token.
* [Login redirects](/docs/login-redirects), the other part of the auth handling.
