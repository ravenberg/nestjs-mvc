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

## In detail

### Which fields are checked

The browser always sends the whole form, so a rule that compares two fields, like a password confirmation, sees both values. But it only asks about the fields the user has touched, so fields they haven't reached yet don't light up red.

A field is only checked again when its value changed, and checks wait 1.5 seconds after the last change. You can change that wait with `form.setValidationTimeout(500)`, in milliseconds.

### More helpers on the form

* `form.valid('email')` is `true` once the field was checked and passed, handy for a "Looks good" message.
* `form.validating` is `true` while a check runs.
* `form.touch('name')` marks a field as touched without checking it, and `form.validate()` without a field checks every touched field at once.

### What runs on the server

Your pipes run for every `@Body()`, `@Query()` and `@Param()`, in the same order as on a real submit: the global ones, then those on the controller, the handler and the parameter. Other parameters, like `@Headers()` or your own decorators, are skipped. A route without any pipes always passes.

Your guards do run. If the user was logged out in the meantime, the check gets a `401` instead of being sent to the login page, and an expired page gets a `419`.

When a pipe fails without naming a field, like `ParseIntPipe` on an `:id` that isn't a number, the check doesn't count it as a verdict and simply fails with a `400`.

### Files

Files are left out of live checks, so check them when the form is submitted, as in [File uploads](/docs/file-uploads).

### Forms with an error bag

A live check writes its errors straight into its own form, so it doesn't use an [error bag](/docs/forms#two-forms-on-one-page). You can still give the real submit one, and it works as usual.
