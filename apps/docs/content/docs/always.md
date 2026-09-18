---
title: always()
---

`always()` marks a prop that goes out with every response, including partial reloads that didn't ask for it. {% .lead %}

## Signature

```ts
import { always } from 'nestjs-mvc'

always<T>(value: T | (() => T | Promise<T>)): AlwaysProp<T>
```

It takes a value or a function, and no options. A function runs on every response, so keep it cheap.

```ts
@Get()
@View('Inbox')
inbox() {
  return {
    messages: () => this.messages.forInbox(),
    unread: always(() => this.messages.unreadCount()),
  }
}
```

## What happens on the wire

Nothing in the page object marks an `always()` prop. It's simply there on every response. On a partial reload for `messages`:

```http
GET /inbox HTTP/1.1
X-Inertia: true
X-Inertia-Partial-Component: Inbox
X-Inertia-Partial-Data: messages
```

the response carries `unread` too:

```json
{
  "component": "Inbox",
  "props": { "errors": {}, "messages": [], "unread": 3 },
  "url": "/inbox",
  "version": "…"
}
```

It also ignores `X-Inertia-Partial-Except`: a reload with `except: ['unread']` still sends `unread`.

## The errors prop

nestjs-mvc adds one `always()` prop to every page itself: `errors`, the validation errors (an empty object when there are none). That's why `errors` shows up in every response above. The client uses the empty object on deferred loads, polls, `WhenVisible` and infinite scroll to keep the errors it already shows. Since `errors` is an object, the first pitfall below applies to it as well.

## When do you need it?

Less often than you might think. After a partial reload the client keeps every prop the response didn't include, so data you share on every page stays on screen without `always()`. Use it for a value that has to be **fresh** after any request, like an unread count or a queue length that a partial reload for something else should update too.

## Nested always() props

`always()` works inside plain objects and closures, but only when the parent is part of the response. The server doesn't open a parent that the reload didn't ask for, because that would mean calling every closure on every partial reload.

```ts
return {
  auth: () => ({
    user: this.users.current(),
    unread: always(() => this.messages.unreadCount()),
  }),
  messages: () => this.messages.forInbox(),
}
```

| Partial reload | `auth.unread` |
|---|---|
| `only: ['messages']` | Left out. `auth` isn't called, and the page keeps the `auth` it had. |
| `only: ['auth.user']` | Sent. `auth` is opened for `user`, so `unread` comes along. |
| `except: ['auth.unread']` | Sent. `auth` is opened, and the nested prop ignores `except`. |

This is the behaviour reported in [nestjs-mvc#8](https://github.com/ravenberg/nestjs-mvc/issues/8), and it's still the case. To get a value on every response, put `always()` on a top level key:

```ts
return {
  auth: () => ({ user: this.users.current() }),
  unread: always(() => this.messages.unreadCount()),
}
```

## Pitfalls

{% callout title="Objects and arrays arrive empty on partial reloads" type="warning" %}
Right now an `always()` prop whose value is an object or an array keeps its contents only when the response includes it on purpose: first loads, visits, reloads that name it in `only`, and reloads that use just `except`. On a partial reload whose `only` doesn't name it, it's sent as `{}` or `[]`, and that empty value replaces what the page had. Numbers, strings, booleans and `null` are not affected. Until this changes, keep `always()` for simple values, or add the prop to `only` when you reload.
{% /callout %}

{% callout title="It runs every time" %}
A function passed to `always()` is called on every Inertia request to that page, including every deferred group, every poll and every infinite scroll page. Don't put a slow query in it.
{% /callout %}

## See also

- [Data on every page](/docs/shared-data), the guide
- [Shared props](/docs/shared-props)
- [Partial reloads](/docs/partial-reloads)
- [Lazy props](/docs/lazy-props)
