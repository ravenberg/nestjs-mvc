---
title: Forms and validation
---

A form sends data to a controller. If it is valid, you save it and redirect. If not, the errors show up next to the fields. {% .lead %}

## The controller

Validate with a DTO, as you would in any NestJS app. Then save and redirect.

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

Notice what is missing: there is no code for the error case. When validation fails, nestjs-mvc sends the user back to the form with the errors. This works because of the `validationExceptionFactory` you added during [installation](/docs/installation).

## The page

`useForm` keeps the form data, sends it, and gives you the errors.

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

* `form.data` holds the values.
* `form.post(url)` sends them. There is also `form.put`, `form.patch` and `form.delete`.
* `form.errors` holds one message per field.
* `form.processing` is `true` while the request runs.

## Errors that are not about the format

Some rules need the database, like "this email is already taken". Throw a `ValidationException` from your handler or service. It works exactly like a failed DTO:

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

## After a success

Reset the form, or show a message with a [flash message](/docs/flash-messages):

```tsx
form.post('/users', {
  onSuccess: () => form.reset(),
})
```

## Editing

For an edit form, fill `useForm` with the current values and send a `PUT`:

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

```ts
@Put(':id')
async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
  await this.users.update(id, dto)
  return this.view.redirect(`/users/${id}`)
}
```

{% callout title="Prefer Zod?" %}
Any Standard Schema library works too (Zod, Valibot, ArkType). Use `@Body({ schema: UserSchema })` with NestJS's `StandardSchemaValidationPipe` and `standardSchemaExceptionFactory` from `nestjs-mvc`. The errors reach your form the same way.
{% /callout %}
