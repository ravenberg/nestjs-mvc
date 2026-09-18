---
title: ViewService
---

`ViewService` is the request scoped helper for everything a handler says besides its props: where to redirect, what to flash, what to share, and how the page should behave in the browser. {% .lead %}

## Usage

Inject it like any provider. `MvcModule` is global, so there is nothing to import besides the class:

```ts
import { ViewService } from 'nestjs-mvc'

@Controller('posts')
export class PostsController {
  constructor(private readonly view: ViewService) {}

  @Post()
  async store(@Body() dto: CreatePostDto) {
    const post = await this.posts.create(dto)
    return this.view.flash('message', 'Post published.').redirect(`/posts/${post.id}`)
  }
}
```

## Signature

```ts
class ViewService {
  // Queue something for the page
  share(key: string, value: unknown): this
  share(props: Record<string, unknown>): this
  getShared(): Record<string, unknown>
  flash(key: string, value: unknown): this
  flash(data: Record<string, unknown>): this
  refresh(...keys: string[]): this
  encryptHistory(enabled = true): this
  clearHistory(): this
  preserveFragment(): this
  enableSsr(): this
  disableSsr(): this

  // End the request
  redirect(url: string, status?: number): never
  back(fallback = '/', status?: number): never
  intended(fallback = '/'): never
  location(url: string): never
}
```

The first group returns the service, so calls chain. The second group throws, so nothing after it runs, and it ends a chain: `this.view.flash('message', 'Saved.').clearHistory().back()`.

| Method | What it does | Lands on |
| --- | --- | --- |
| `share()` | Adds props to this request's shared props. | This render only. |
| `getShared()` | Returns this request's shared props object (the live object, not a copy). | |
| `flash()` | Queues data for the page object's `flash` field. | This render, or the next request after a redirect. |
| `refresh()` | Resolves these [`once()`](/docs/once-props) keys again even though the client says it has them. | This render, or the next request after a redirect. |
| `encryptHistory()` | Turns [history encryption](/docs/encrypt-history) on (or off with `false`) for this request. | This render only. |
| `clearHistory()` | Tells the client to drop its history encryption key. | This render, or the next request after a redirect. |
| `preserveFragment()` | Keeps the `#fragment` the client visited with on the page it lands on. | This render, or the next request after a redirect. |
| `enableSsr()`, `disableSsr()` | Overrides `@Ssr()` for this request. | This render only. |
| `redirect()` | Redirects to `url`. | Ends the request. |
| `back()` | Redirects to the `Referer`, if it's on this app, else to `fallback`. | Ends the request. |
| `intended()` | Redirects to the page a 401 turned the user away from, else to `fallback`. | Ends the request. |
| `location()` | Sends the browser to `url` with a full page load. | Ends the request. |

## Request scope

The service is `@Injectable({ scope: Scope.REQUEST })`: every request gets its own instance, and it only ever touches that request. Everything it queues lives on the request object itself, so you can't leak one user's flash into another's page.

Nest's scope rule applies: a class that injects a request scoped provider becomes request scoped too, so your controller is created per request. Guards, interceptors and handlers can all inject it. In a middleware, use `requestState(req)` instead, which is what the service writes to (see [Shared props](/docs/shared-props)).

## When a queued item lands

`flash()`, `refresh()`, `clearHistory()` and `preserveFragment()` go into a pending bag on the request. Where they end up depends on how the request ends:

* **The handler renders a page** (it has `@View()`, or an error page renders): the bag is applied to this page object, together with whatever the previous request left for this client.
* **The request redirects** through `redirect()`, `back()`, `intended()` or `location()`, or through the validation and 401 flows: the bag is written to the flash store (a signed cookie by default), merged with anything still waiting there. The next page render applies it and clears it.
* **Neither** (a route without `@View()` that returns JSON, say): nothing writes the bag, and it's lost.

A redirect with an empty bag and nothing waiting doesn't touch the cookie at all.

```ts
@Post('logout')
logout() {
  // clearHistory rides the redirect and lands on the /login page
  return this.view.clearHistory().redirect('/login')
}
```

`share()`, `encryptHistory()`, `enableSsr()` and `disableSsr()` only change this request. They don't survive a redirect.

## What happens on the wire

All four redirect methods throw an `MvcRedirect`, which the module's exception filter turns into a response through Nest's HTTP adapter, so they work the same on Express and Fastify.

### redirect() and back()

The status follows the protocol unless you pass one:

| Request method | Default status |
| --- | --- |
| `GET`, `POST` | `302` |
| `PUT`, `PATCH`, `DELETE` | `303` |

The `303` makes the browser follow up with a `GET`. Passing `302` explicitly still becomes `303` after `PUT`, `PATCH` or `DELETE`; any other status you pass (`301`, `307`) is used as is.

```http
PUT /posts/1 HTTP/1.1
X-Inertia: true
```

```http
HTTP/1.1 303 See Other
Location: /posts/1
Set-Cookie: mvc_flash=...
```

`back()` reads the `Referer` header. It only follows it when it's a path (`/x`, not `//x`) or an absolute `http(s)` URL on this app's origin, and never when it contains a backslash, whitespace or a control character. Anything else goes to `fallback`. The origin is the module's `url` option when set, else the one the platform reports (which honours Express's `trust proxy` and Fastify's `trustProxy`).

`redirect()` doesn't check its URL. Only pass it URLs you built yourself.

### A URL with a fragment

A browser's XHR drops the `#fragment` when it follows a redirect. So on an Inertia visit, a redirect to a URL with `#` in it is answered with a `409` instead, and the client visits the URL itself, with a `GET`:

```http
HTTP/1.1 409 Conflict
X-Inertia-Redirect: /settings#security
```

A prefetch request and a request without `X-Inertia` get the normal redirect.

### location()

`location()` is for URLs outside your app, like a payment page or an identity provider. On an Inertia visit it answers:

```http
HTTP/1.1 409 Conflict
X-Inertia-Location: https://checkout.example.com/session/abc
```

The client then sets `window.location` to that URL (or reloads, if it's the page it's already on). A request without `X-Inertia` gets a normal `302` or `303` redirect to the URL.

### intended()

When a guard throws a 401 on a page load or an Inertia visit, the module sends the user to the login page and remembers where they were going in a signed cookie (`mvc_intended`, for one hour). `intended(fallback)` redirects there, or to `fallback` when there's nothing remembered or it's not on this app, and deletes the cookie either way. The details are in [Login redirects](/docs/login-redirects).

```ts
@Post('login')
async login(@Body() credentials: Credentials) {
  await this.auth.signIn(credentials)
  return this.view.intended('/dashboard')
}
```

## preserveFragment()

A form on `/settings#security` posts, and your handler sends it `back()`. The redirect goes to the `Referer`, which has no fragment, so the user lands at the top of the page. With `preserveFragment()` the page object gets `preserveFragment: true`, and the client puts the fragment it visited with back on the URL:

```ts
@Post('settings/profile')
profile() {
  return this.view.preserveFragment().flash('message', 'Profile saved.').back()
}
```

## Combining it with other features

* `flash()` is covered in depth in [Flash data](/docs/flash), `refresh()` in [once()](/docs/once-props).
* `share()` and `getShared()` are in [Shared props](/docs/shared-props).
* `encryptHistory()` and `clearHistory()` are in [History encryption](/docs/encrypt-history).
* `enableSsr()` and `disableSsr()` are in [@Ssr()](/docs/ssr).
* A failed validation redirects back on its own, with the errors in the same bag. See [Validation](/docs/validation).

## Pitfalls

{% callout title="Redirects throw" type="warning" %}
`redirect()`, `back()`, `intended()` and `location()` end the handler by throwing. A `try`/`catch` around them catches the redirect too. Rethrow anything that is an `MvcRedirect`, or keep the redirect outside the `try`.
{% /callout %}

* **Queue before you redirect.** A call after the redirect never runs. Chaining helps: `this.view.flash(...).back()` reads in the right order.
* **Queued data needs a render or a redirect.** Flashing from a JSON route without `@View()` does nothing.
* **Express's `res.redirect()` carries less.** Calling it yourself on an Inertia visit still gets the `303` conversion, the fragment `409` and the flash data, but it only writes the bag when something was flashed or refreshed. A lone `clearHistory()` or `preserveFragment()` before `res.redirect()` is lost. Use the service's methods.

## See also

* [Redirects](/docs/redirects), the guide.
* [Flash messages](/docs/flash-messages) and [Flash data](/docs/flash).
* [@View()](/docs/view), for what a render sends.
