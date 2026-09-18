---
title: Redirects
---

After a form saves something, you send the user to a page, and `ViewService` gives you three ways to do that. {% .lead %}

## Inject ViewService

```ts
import { ViewService } from 'nestjs-mvc'

@Controller('users')
export class UsersController {
  constructor(private readonly view: ViewService) {}
}
```

## To a page

```ts
@Post()
async store(@Body() dto: CreateUserDto) {
  const user = await this.users.create(dto)
  return this.view.redirect(`/users/${user.id}`)
}
```

## Back to where the user came from

`back()` goes to the previous page, which is handy when the same form shows up in several places.

```ts
@Post(':id/like')
async like(@Param('id', ParseIntPipe) id: number) {
  await this.posts.like(id)
  return this.view.back()
}
```

`back()` always stays on your site. If the previous page was somewhere else, the user goes to `/`, or to a fallback you pass, like `back('/posts')`.

## To another website

A normal redirect stays inside your app. For an outside URL, like a payment page or a login provider, use `location()` and the browser does a full page load:

```ts
@Post('checkout')
async checkout() {
  const session = await this.payments.createCheckout()
  return this.view.location(session.url)
}
```

## Why redirect at all?

You could return a page straight from a `POST`, but redirecting works better. Refreshing won't submit the form a second time, and the page you land on gets fresh data from its own controller.

## Good to know

* These methods stop the handler by throwing a special exception, so code after them won't run. Writing `return this.view.redirect(...)` makes that clear when you read it.
* After a `PUT`, `PATCH` or `DELETE`, nestjs-mvc answers with status `303` so the browser follows up with a `GET`. That happens on its own.
* You can put a [flash message](/docs/flash-messages) in front, like `this.view.flash('message', 'Saved.').back()`.

## In detail

### Choosing the status yourself

`redirect()` and `back()` take a status as their second argument. Without one you get `302`, or `303` after a `PUT`, `PATCH` or `DELETE`. Asking for `302` after one of those still gives you `303`, so the browser never repeats a `DELETE`. Any other status, like `301` or `307`, is used as you wrote it.

```ts
return this.view.redirect('/new-address', 301)
```

### When back() goes to the fallback

`back()` uses the address of the page the request came from, as the browser reports it. It only follows that address when it's on your own site, so a link from another website can't send your users somewhere else. When there's no such address, or it's on another site, the user goes to the fallback.

Behind a proxy, your app has to know its public address to tell whether a page is on your site. [Production](/docs/production) shows how to set that.

### Don't redirect to user input

`redirect()` goes wherever you tell it, without any checks. Pass it URLs you built yourself, not a `?next=` parameter from the query string. For "back to where they were", use `back()` or `intended()`, which only stay on your site.

### Jumping to a section

A redirect to a URL with a fragment, like `/settings#security`, lands on that section, just like you'd expect.

`back()` can't do that on its own, because the address it goes to has no fragment. When a form on `/settings#security` sends the user back, call `preserveFragment()` first, and they land on the section they came from:

```ts
@Post('settings/profile')
profile() {
  return this.view.preserveFragment().flash('message', 'Profile saved.').back()
}
```

### A redirect inside try/catch

Because the redirect methods throw, a `try`/`catch` around them catches the redirect too, and the user never gets sent anywhere. Keep the redirect after the `try`:

```ts
let order: Order
try {
  order = await this.orders.place(dto)
} catch {
  return this.view.flash('error', 'That did not work.').back()
}
return this.view.redirect(`/orders/${order.id}`)
```

### Things you queue need a page or a redirect

A flash message, `preserveFragment()` and the like are carried to the next page by a redirect, or land on the page this handler renders. On a route without `@View()` that returns JSON, there's neither, so they're lost.
