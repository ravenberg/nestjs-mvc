---
title: Error bags
---

An error bag gives the errors of one form their own key in the `errors` prop, so two forms on one page never show each other's messages. {% .lead %}

## Usage

Name the bag in the visit options when you submit. Nothing changes on the server.

{% framework-code %}
```tsx
import { useForm } from 'nestjs-mvc/react'

export default function Account() {
  const profile = useForm({ name: '' })
  const password = useForm({ current: '', password: '' })

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); profile.put('/account/profile', { errorBag: 'profile' }) }}>
        <input value={profile.data.name} onChange={(e) => profile.setData('name', e.target.value)} />
        {profile.errors.name && <p>{profile.errors.name}</p>}
      </form>

      <form onSubmit={(e) => { e.preventDefault(); password.put('/account/password', { errorBag: 'password' }) }}>
        <input type="password" value={password.data.current} onChange={(e) => password.setData('current', e.target.value)} />
        {password.errors.current && <p>{password.errors.current}</p>}
      </form>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const profile = useForm({ name: '' })
const password = useForm({ current: '', password: '' })
</script>

<template>
  <form @submit.prevent="profile.put('/account/profile', { errorBag: 'profile' })">
    <input v-model="profile.name" />
    <p v-if="profile.errors.name">{{ profile.errors.name }}</p>
  </form>

  <form @submit.prevent="password.put('/account/password', { errorBag: 'password' })">
    <input v-model="password.current" type="password" />
    <p v-if="password.errors.current">{{ password.errors.current }}</p>
  </form>
</template>
```
{% /framework-code %}

`errorBag` is a visit option (`string | null`), so it works on `router.post()` and friends too, and the `Form` component takes it as a prop. It is not an argument of `useForm` itself.

## What happens on the wire

When `errorBag` is a non empty string, the client sends it as a header:

```http
PUT /account/password HTTP/1.1
X-Inertia: true
X-Inertia-Error-Bag: password
```

The server validates as always. When [validation](/docs/validation) fails, it stores the field errors under the bag's name before redirecting back, so the next render has them one level deeper:

```json
{
  "component": "Account",
  "props": {
    "errors": {
      "password": { "current": "That is not your current password." }
    }
  }
}
```

Without the header, the same failure gives `{ "errors": { "current": "…" } }`. The field keys inside the bag are the same dot paths either way.

The bag also applies to errors that don't come from a pipe:

* a [`ValidationException`](/docs/validation) you throw from the handler;
* `{ redirect: 'back', errors }` returned from [`errorPages`](/docs/error-pages);
* the `_form` error that comes with an expired [CSRF token](/docs/csrf).

## On the client

The client takes the errors out of the bag for you. When the visit named a bag, `onError` receives `errors[bag]` (or `{}` when the bag is missing), and `useForm` puts that in `form.errors`. So the form reads `form.errors.current`, not `form.errors.password.current`.

`usePage().props.errors` is the raw prop, with the bag's name as the first key.

## What happens to other bags

The server only stores the errors of the request that failed. The `errors` prop of the next render holds that one bag and nothing else, so errors an earlier submit put in `props.errors` are gone from it.

A form made with `useForm` keeps its own copy of its errors. Submitting the profile form doesn't touch what the password form shows, and the password form replaces its errors the next time it's submitted itself.

## Combining it with Precognition

[Precognition](/docs/precognition) doesn't use error bags. The client's live validation doesn't send `X-Inertia-Error-Bag`, and the server's `422` answer is always flat:

```json
{ "message": "The given data was invalid.", "errors": { "current": "Required" } }
```

That's what the form needs, because the validator writes straight into its own form. You can give a precognitive form an `errorBag` for its real submit and it works as described above.

## Pitfalls

* A JSON answer (a request without `X-Inertia`, or `jsonStatus: 422`) is never put in a bag. Bags only exist in the redirect back flow.
* If you read `usePage().props.errors` directly while forms use bags, remember the extra level.
* The name you give is used as it is, as the key in `errors`. The server doesn't check it, so the client and the page have to agree on the spelling.

## See also

* [Forms and validation](/docs/forms), the guide.
* [Validation](/docs/validation), for how errors are collected and where they go.
* [Precognition](/docs/precognition).
