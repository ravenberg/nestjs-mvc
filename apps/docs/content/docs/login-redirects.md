---
title: Login redirects
---

When a guard throws a `401` on a page, nestjs-mvc sends the visitor to your login page, remembers where they were going, and resets the browser when the logged in user changes. {% .lead %}

## Signature

Everything is configured with the `auth` option of `MvcModule.forRoot()`. Every member is optional:

```ts
MvcModule.forRoot({
  auth: {
    loginUrl: '/login',                              // string | false
    user: (req) => req.user,                         // who is logged in
    share: (user: User, req) => ({ id: user.id, name: user.name }),
    id: (user: User) => user.id,                     // how to tell users apart
  },
})
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `loginUrl` | `string \| false` | `'/login'` | Where a page request goes on a `401`. `false` keeps the `401`. An absolute `http(s)://` URL (a hosted login) works too. |
| `user(req)` | function | `req.user` | Reads the logged in user from the request, wherever your guard put it. |
| `share(user, req)` | function | none | What pages see as the `auth.user` prop. Without it, no `auth.user` is added. |
| `id(user)` | function | `user.id ?? user.sub ?? user._id` | The user's id, used to notice when the user changes. |

After a login, redirect with `ViewService.intended()`:

```ts
intended(fallback = '/'): never
```

It sends the visitor to the page they were on their way to, or to `fallback` when there isn't one.

## Which requests get the redirect

nestjs-mvc doesn't care which guard said no. Any `HttpException` with status `401` counts, so an `UnauthorizedException` from your own guard and one from Passport's `AuthGuard('jwt')` work the same way (the exported helper is `isUnauthenticated(exception)`).

The `401` becomes a redirect only when the request wants a page. `wantsPage(req)` decides that, in this order:

1. A Precognition request (`Precognition: true`) wants data.
2. An Inertia visit (`X-Inertia: true`) wants a page.
3. A request with `X-Requested-With: XMLHttpRequest` wants data.
4. Anything else wants a page when its `Accept` header contains `text/html`.

So a browser navigation and an Inertia visit are sent to the login page, while `useHttp`, `fetch` with a JSON `Accept`, and Precognition keep the plain `401`. `useHttp` goes through Inertia's HTTP client, which sets `X-Requested-With: XMLHttpRequest` on every request and doesn't send `X-Inertia`, so your code sees the `401` and can react to it.

The login page itself is never sent to the login page. When the request path equals the path of `loginUrl`, the `401` stays a `401`.

## What happens on the wire

A guest opens `/dashboard?tab=2`:

```http
GET /dashboard?tab=2
Accept: text/html

HTTP/1.1 302 Found
Location: /login
Set-Cookie: mvc_intended=%2Fdashboard%3Ftab%3D2.<signature>; Path=/; Max-Age=3600; HttpOnly; SameSite=Lax
```

An Inertia visit gets the same `302`, and the client follows it to the login page. After a `PUT`, `PATCH` or `DELETE` the status is `303`, so the follow up request is a `GET`.

When `loginUrl` is an absolute URL, a normal page load gets the `302` to it, but an Inertia visit gets a full page visit instead, the same as `location()`:

```http
HTTP/1.1 409 Conflict
X-Inertia-Location: https://id.example.com/login
```

## The intended URL

Before the redirect, nestjs-mvc stores the page the visitor was going to in the `mvc_intended` cookie (exported as `INTENDED_COOKIE`):

* For a `GET`, it's the URL that was requested, path and query.
* For any other method, it's the `Referer`: the page the form was on, not the URL the form posted to.
* A prefetch (`Purpose: prefetch`) stores nothing, so hovering a protected link can't overwrite what's there.
* A URL that isn't on your app (a `Referer` from another site, `//evil.example`) isn't stored.

The cookie is signed with your app's keys, `HttpOnly`, `SameSite=Lax`, `Secure` when the app is served over https, and lasts one hour (`Max-Age=3600`), long enough for a password manager and a 2FA code.

`view.intended(fallback)` reads it back. It only uses the URL when the signature is valid and the URL is still on your app, so a cookie the visitor made up or edited sends them to `fallback`. Either way, the cookie is cleared on the redirect that `intended()` answers with.

```ts
@Post('login')
@Public()
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const user = await this.auth.validate(dto.email, dto.password)
  if (!user) throw new ValidationException({ email: 'Wrong email or password.' })

  res.cookie('access_token', await this.auth.createToken(user), { httpOnly: true, sameSite: 'lax' })
  return this.view.intended('/dashboard')
}
```

The cookies you set in the handler travel on the same redirect. Like the other `ViewService` redirects, `intended()` throws to stop the handler, so nothing after it runs.

## The user on every page

With `share`, every page gets an `auth.user` prop: whatever `share` returns, or `null` for a guest. It runs after your guards, so the user is already on the request. If your app shares an `auth` object itself, `user` is merged into it.

Without `share`, nothing is added. In development, nestjs-mvc logs a warning once when `request.user` is set but not shared.

## When the user changes

When someone logs in, logs out, or another user logs in, the browser still holds what the previous user loaded: `once()` props, the prefetch cache, component state and history. nestjs-mvc throws all of that away with one full page load.

### The user in the page version

Every page object has a `version`, and the client sends it back as `X-Inertia-Version` on every request it makes from that page. When someone is logged in, nestjs-mvc adds a digest of their id to the asset version:

```json
{
  "component": "Dashboard",
  "version": "v1#Xk3...digest",
  "url": "/dashboard"
}
```

A guest's page has the asset version alone. The digest is a keyed hash, so the id itself can't be read from it. `versionFor(asset, identity)` builds this value, and `identityInVersion(sent, asset)` reads the digest back out of what the client sent: the digest, `null` for a guest page, or `undefined` when the asset part isn't the current one.

### A stale page gets a 409

On every Inertia request, after your guards have run and before the handler does, nestjs-mvc compares the user in the page's version with whoever is logged in now. When they differ, the handler doesn't run:

```http
GET /dashboard?tab=2
X-Inertia: true
X-Inertia-Version: v1#<digest of user 1>

HTTP/1.1 409 Conflict
X-Inertia-Location: /dashboard?tab=2
X-Inertia-Version: v1#<digest of user 2>
```

The client answers a `409` with `X-Inertia-Location` by loading that URL as a full page, which clears everything it held. The page that loads also gets `clearHistory: true`.

* A `GET` reloads the page it asked for.
* A `POST`, `PUT`, `PATCH` or `DELETE` is **not** carried out for the new user. The client goes back to the page the form was on (the `Referer`, or `/`), and the form can be submitted again from there.
* A prefetch from a stale page gets the same `409`, and the client only acts on it when the link is clicked.
* A Precognition request is left alone, because it doesn't change anything.

This catches a switch made in another tab too. Tabs share cookies but not pages, so the tab that still shows user 1's page is reset on its next visit.

The asset check is separate: the middleware compares only the asset part of the version, so a page from before a deploy gets its own `409` whoever it was rendered for.

### Full page loads

A full page load, like the redirect after a classic form login or an OAuth callback, carries no page version. For those, nestjs-mvc keeps a digest of the last user this browser was shown in the `mvc_identity` cookie (`HttpOnly`, `SameSite=Lax`). When it differs from the current user, the page gets `clearHistory: true` and the cookie is updated, or cleared after a logout.

### Users without an id

The reset needs to tell users apart. By default it reads `user.id`, then `user.sub`, then `user._id`. If your user has none of those, there's no reset at all, and in development nestjs-mvc logs a warning once. Tell it where the id is with `auth.id`:

```ts
auth: { id: (user: Account) => user.accountNumber }
```

## Combining it with other features

* **Error pages.** `errorPages` runs before the login redirect. If it returns a page or a redirect for a `401`, the visitor gets that instead of the login page, so return nothing for `401` to keep the redirect. See [error pages](/docs/error-pages).
* **Flash data.** Flash data queued in the request travels with the login redirect. See [flash data](/docs/flash).
* **Redirects.** `intended()` behaves like `redirect()` from [ViewService](/docs/view-service): `302`, or `303` after `PUT`, `PATCH` and `DELETE`.
* **Prefetching.** A prefetched protected link neither stores an intended URL nor updates the identity cookie. See [prefetch requests](/docs/prefetch-requests).

## Pitfalls

{% callout title="Keep your login route public" type="warning" %}
If your guard throws a `401` on the login page itself, the visitor gets the `401` (nestjs-mvc never redirects the login page to itself). Mark the login routes as public in your guard.
{% /callout %}

* `share` decides what reaches the browser. Everything it returns ends up in the HTML source, so never return the whole user.
* An API route that browsers can open directly (with `Accept: text/html`) is treated as a page and gets the redirect. JSON clients should send `Accept: application/json` or `X-Requested-With: XMLHttpRequest`.
* With `loginUrl: false`, nothing is redirected and nothing is remembered, so `intended()` always uses its fallback.

## See also

* [Authentication](/docs/authentication), the guide.
* [ViewService](/docs/view-service) for the other redirects.
* [Shared props](/docs/shared-props) for sharing more than the user.
* [@SkipCsrf()](/docs/skip-csrf) and [SignedUrls](/docs/signed-url-api), which use the same keys.
