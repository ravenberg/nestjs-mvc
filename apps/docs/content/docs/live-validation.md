---
title: Live validation
---

Show errors while the user fills in the form, not only after they submit. Your server rules stay the only rules. {% .lead %}

## Turn it on

Pass the method and URL to `useForm`, then call `validate` when a field loses focus:

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

## The server

Nothing changes. It is the same `POST /users` with the same DTO:

```ts
@Post()
async store(@Body() dto: CreateUserDto) {
  await this.users.create(dto)
  return this.view.redirect('/users')
}
```

When the user leaves the email field, the browser sends the form to that route and asks: "only validate, do not save". nestjs-mvc runs your validation pipes and stops. Your handler does not run, so nothing is saved.

## Rules that need the database

Only your pipes run during live validation, not your handler. A check like "this email is taken" inside the handler is therefore only checked on submit.

To check it live, move it into validation. With class-validator that is a custom async constraint. With Zod it is an async `refine`:

```ts
const UserSchema = z.object({
  email: z.email().refine(async (email) => !(await users.emailTaken(email)), 'That email is taken.'),
})
```

{% callout title="Pipes run on every check" type="warning" %}
Every live check runs your pipes. A pipe that writes to the database or sends a mail would do that on every blur. Keep pipes free of side effects.
{% /callout %}
