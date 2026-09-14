---
title: Redirects
---

After a form saves something, send the user to a page. `ViewService` has three ways to do that. {% .lead %}

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

`back()` returns to the previous page. Handy when the same form appears in several places.

```ts
@Post(':id/like')
async like(@Param('id', ParseIntPipe) id: number) {
  await this.posts.like(id)
  return this.view.back()
}
```

`back()` never sends the user to another website. If the previous page is not on your app, it goes to `/`. Pass another fallback if you like: `back('/posts')`.

## To another website

A normal redirect stays inside your app. For an outside URL, like a payment page or a login provider, use `location()`. The browser then does a full page load:

```ts
@Post('checkout')
async checkout() {
  const session = await this.payments.createCheckout()
  return this.view.location(session.url)
}
```

## Why redirect at all?

After a `POST` you could return a page directly. Redirecting is better: a refresh does not submit the form again, and the page you land on shows fresh data from its own controller.

## Good to know

* The methods throw a special exception to stop the handler. Code after them does not run. Writing `return this.view.redirect(...)` makes that easy to read.
* After a `PUT`, `PATCH` or `DELETE`, nestjs-mvc answers with status `303`, so the browser follows up with a `GET`. You do not have to think about it.
* Chain a [flash message](/docs/flash-messages) in front: `this.view.flash('message', 'Saved.').back()`.
