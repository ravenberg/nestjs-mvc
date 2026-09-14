---
title: Error pages
---

When a controller throws `NotFoundException`, show your own page instead of a JSON error. {% .lead %}

## An error page

Tell `MvcModule` which errors get a page:

```ts
MvcModule.forRoot({
  vite: {},
  errorPages: ({ status }) => {
    if ([403, 404, 500, 503].includes(status)) {
      return { component: 'Error', props: { status } }
    }
  },
})
```

```tsx
// frontend/pages/Error.tsx
const titles: Record<number, string> = {
  403: 'You cannot see this page',
  404: 'Page not found',
  500: 'Something went wrong',
  503: 'Back soon',
}

export default function Error({ status }: { status: number }) {
  return <h1>{titles[status]}</h1>
}
```

Now `throw new NotFoundException()` anywhere shows this page, with status 404. Errors you do not return a page for keep NestJS's default response.

## Keep the stack trace while developing

In development you usually want the real error. Return nothing then:

```ts
errorPages: ({ status, isDevelopment }) => {
  if (isDevelopment) return
  if ([403, 404, 500, 503].includes(status)) {
    return { component: 'Error', props: { status } }
  }
}
```

## Show your layout and user

An error page does not get [shared data](/docs/shared-data) unless you ask for it. Add `shared: true` when your layout needs it:

```ts
return { component: 'Error', props: { status }, shared: true }
```

## Send the user back instead

Some errors are not a dead end. For "too many requests" it is nicer to go back to the form with a message:

```ts
errorPages: ({ status }) => {
  if (status === 429) {
    return { redirect: 'back', flash: { message: 'Slow down and try again in a minute.' } }
  }
}
```

To show the message on a form field instead, return `errors`:

```ts
return { redirect: 'back', errors: { email: 'Too many attempts. Try again in a minute.' } }
```

## An expired page

If a page is open for a long time, a form on it can expire. nestjs-mvc handles that for you: the user goes back to the form with "This page has expired. Please try again." and what they typed is kept. See [CSRF protection](/docs/csrf).
