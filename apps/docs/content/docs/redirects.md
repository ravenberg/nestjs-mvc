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

Every method of `ViewService` and what it sends over the wire is in the [reference](/docs/view-service).
