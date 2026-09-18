---
title: Forms and validation
---

A form sends data to a controller. When the data is valid you save it and redirect, and when it isn't, the errors show up next to the fields. {% .lead %}

## The controller

Validate with a DTO like you would in any NestJS app, then save and redirect.

```ts
// src/users/create-user.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator'

export class CreateUserDto {
  @IsNotEmpty({ message: 'Please enter a name.' })
  name: string

  @IsEmail({}, { message: 'That is not an email address.' })
  email: string
}
```

```ts
// src/users/users.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'
import { CreateUserDto } from './create-user.dto'

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly view: ViewService,
  ) {}

  @Get('create')
  @View('Users/Create')
  create() {
    return {}
  }

  @Post()
  async store(@Body() dto: CreateUserDto) {
    await this.users.create(dto)
    return this.view.redirect('/users')
  }
}
```

You'll notice there's no code for when validation fails. nestjs-mvc sends the user back to the form with the errors, thanks to the `validationExceptionFactory` you added during [installation](/docs/installation).

## The page

`useForm` holds the form data, sends it and gives you the errors back.

{% framework-code %}
```tsx
// frontend/pages/Users/Create.tsx
import { useForm } from 'nestjs-mvc/react'

export default function Create() {
  const form = useForm({ name: '', email: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.post('/users')
  }

  return (
    <form onSubmit={submit}>
      <input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
      {form.errors.name && <p>{form.errors.name}</p>}

      <input value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
      {form.errors.email && <p>{form.errors.email}</p>}

      <button disabled={form.processing}>Save</button>
    </form>
  )
}
```

```vue
<!-- frontend/pages/Users/Create.vue -->
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const form = useForm({ name: '', email: '' })
</script>

<template>
  <form @submit.prevent="form.post('/users')">
    <input v-model="form.name" />
    <p v-if="form.errors.name">{{ form.errors.name }}</p>

    <input v-model="form.email" />
    <p v-if="form.errors.email">{{ form.errors.email }}</p>

    <button :disabled="form.processing">Save</button>
  </form>
</template>
```
{% /framework-code %}

{% framework name="react" %}
* `form.data` holds the values, and `form.setData` changes one.
{% /framework %}

{% framework name="vue" %}
* The values are properties of the form itself, so `v-model="form.name"` binds an input to one.
{% /framework %}

* `form.post(url)` sends them, and there's also `form.put`, `form.patch` and `form.delete`.
* `form.errors` holds one message per field.
* `form.processing` is `true` while the request runs.

## Checks in your handler

Some rules need the database, like "this email is already taken". For those, throw a `ValidationException` from your handler or service, and the user gets the error the same way as with a failed DTO:

```ts
import { ValidationException } from 'nestjs-mvc'

@Post()
async store(@Body() dto: CreateUserDto) {
  if (await this.users.emailTaken(dto.email)) {
    throw new ValidationException({ email: 'That email is already taken.' })
  }
  await this.users.create(dto)
  return this.view.redirect('/users')
}
```

Every way errors reach the form is in the [Validation](/docs/validation) reference, and pages with more than one form can keep them apart with [error bags](/docs/error-bags).

## After a success

When saving works, you might want to reset the form. You can also show a [flash message](/docs/flash-messages).

```ts
form.post('/users', {
  onSuccess: () => form.reset(),
})
```

## Editing

For an edit form, start `useForm` with the current values and send a `PUT`:

{% framework-code %}
```tsx
export default function Edit({ user }: { user: { id: number; name: string; email: string } }) {
  const form = useForm({ name: user.name, email: user.email })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.put(`/users/${user.id}`)
  }
  // ...the same fields as above
}
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const props = defineProps<{ user: { id: number; name: string; email: string } }>()
const form = useForm({ name: props.user.name, email: props.user.email })
</script>

<template>
  <form @submit.prevent="form.put(`/users/${user.id}`)">
    <!-- ...the same fields as above -->
  </form>
</template>
```
{% /framework-code %}

```ts
@Put(':id')
async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
  await this.users.update(id, dto)
  return this.view.redirect(`/users/${id}`)
}
```

{% callout title="Prefer Zod?" %}
Any Standard Schema library works too, like Zod, Valibot or ArkType. Use `@Body({ schema: UserSchema })` with NestJS's `StandardSchemaValidationPipe` and `standardSchemaExceptionFactory` from `nestjs-mvc`, and the errors end up in your form the same way.
{% /callout %}
