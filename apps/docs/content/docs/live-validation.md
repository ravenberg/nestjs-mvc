---
title: Live validation
---

You can show errors while the user is still filling in the form, instead of waiting until they submit. The rules still live on your server. {% .lead %}

## Turn it on

Pass the method and URL to `useForm`, then call `validate` when a field loses focus:

{% framework-code %}
```tsx
import { useForm } from 'nestjs-mvc/react'

export default function Register() {
  const form = useForm('post', '/users', { name: '', email: '' })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit() }}>
      <input
        value={form.data.email}
        onChange={(e) => form.setData('email', e.target.value)}
        onBlur={() => form.validate('email')}
      />
      {form.invalid('email') && <p>{form.errors.email}</p>}

      <button disabled={form.processing}>Register</button>
    </form>
  )
}
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const form = useForm('post', '/users', { name: '', email: '' })
</script>

<template>
  <form @submit.prevent="form.submit()">
    <input v-model="form.email" @blur="form.validate('email')" />
    <p v-if="form.invalid('email')">{{ form.errors.email }}</p>

    <button :disabled="form.processing">Register</button>
  </form>
</template>
```
{% /framework-code %}

## The server

The server stays the same, with the same `POST /users` and the same DTO:

```ts
@Post()
async store(@Body() dto: CreateUserDto) {
  await this.users.create(dto)
  return this.view.redirect('/users')
}
```

When the user leaves the email field, the browser sends the form to that route and asks it to only validate. nestjs-mvc runs your validation pipes and stops there, so your handler never runs and nothing gets saved.

## Rules that need the database

Live validation only runs your pipes, so a check like "this email is taken" in your handler only happens when the form is submitted.

To check it live, move it into your validation. With class-validator that means a custom async constraint, and with Zod an async `refine`:

```ts
const UserSchema = z.object({
  email: z.email().refine(async (email) => !(await users.emailTaken(email)), 'That email is taken.'),
})
```

{% callout title="Pipes run on every check" type="warning" %}
Every live check runs your pipes, so a pipe that writes to the database or sends an email would do that every time a field loses focus. Keep your pipes free of side effects.
{% /callout %}

The headers, the responses and every helper on the form are in the [Precognition](/docs/precognition) reference.
