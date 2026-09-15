---
title: Error pages
---

When a controller throws a `NotFoundException`, you can show your own page instead of a JSON error. {% .lead %}

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

{% framework-code %}
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

```vue
<!-- frontend/pages/Error.vue -->
<script setup lang="ts">
defineProps<{ status: number }>()

const titles: Record<number, string> = {
  403: 'You cannot see this page',
  404: 'Page not found',
  500: 'Something went wrong',
  503: 'Back soon',
}
</script>

<template>
  <h1>{{ titles[status] }}</h1>
</template>
```
{% /framework-code %}

Now `throw new NotFoundException()` anywhere shows this page with status 404. Any error you don't return a page for gets NestJS's default response.

## Keep the stack trace while developing

While developing you usually want to see the real error, so return nothing in that case:

```ts
errorPages: ({ status, isDevelopment }) => {
  if (isDevelopment) return
  if ([403, 404, 500, 503].includes(status)) {
    return { component: 'Error', props: { status } }
  }
}
```

## Show your layout and user

Error pages leave out [shared data](/docs/shared-data) unless you ask for it. If your layout needs it, add `shared: true`:

```ts
return { component: 'Error', props: { status }, shared: true }
```

## Send the user back instead

For some errors it's nicer to send people back. With "too many requests", for example, you can return them to the form with a message:

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

When a page has been open for a long time, a form on it can expire. nestjs-mvc takes care of that. The user goes back to the form with "This page has expired. Please try again." and whatever they typed is still there. [CSRF protection](/docs/csrf) explains why it happens.
