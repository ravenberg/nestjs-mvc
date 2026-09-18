---
title: Validation
---

When validation fails on an Inertia visit, nestjs-mvc sends the user back to the form with the errors as the `errors` prop. Everything else, like JSON clients, gets a JSON answer. {% .lead %}

## Signature

You validate with NestJS's own pipes. nestjs-mvc gives them an `exceptionFactory` that keys every message by field, and a `ValidationException` you can throw yourself.

```ts
import {
  ValidationException,
  validationExceptionFactory,
  createValidationExceptionFactory,
  standardSchemaExceptionFactory,
  createStandardSchemaExceptionFactory,
  ROOT_ERROR_KEY, // '_form'
  type FieldErrors, // Record<string, string | string[]>
} from 'nestjs-mvc'

new ValidationException(errors: FieldErrors)

createValidationExceptionFactory(options?: { messages?: 'first' | 'all' })
createStandardSchemaExceptionFactory(options?: { messages?: 'first' | 'all' })
```

`validationExceptionFactory` and `standardSchemaExceptionFactory` are the two `create…` functions called without options, so they keep the first message per field.

The module has one option for validation:

```ts
MvcModule.forRoot({
  validation: { messages: 'first', jsonStatus: 400 },
})
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `messages` | `'first' \| 'all'` | `'first'` | One message per field, or every message as an array. Applies to the formats Nest's pipes produce on their own (see below). The factories take their own `messages` option. |
| `jsonStatus` | `400 \| 422` | `400` | The status for a validation failure on a request that is not an Inertia visit. `400` leaves Nest's response alone. `422` answers `{ message, errors }`. |

## class-validator

Use NestJS's `ValidationPipe` with the factory, globally or on a route:

```ts
import { ValidationPipe } from '@nestjs/common'
import { validationExceptionFactory } from 'nestjs-mvc'

app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
```

The factory flattens class-validator's error tree. Each field gets the message of its first failed constraint, and nested objects become dot paths: an `address` DTO with a failing `zip` gives `address.zip`. Array items become their index, like `tags.0`.

## Standard Schema (Zod, Valibot, ArkType)

With NestJS 12, `@Body({ schema })` validates the body against any Standard Schema through `StandardSchemaValidationPipe`. Give that pipe the Standard Schema factory:

```ts
import { StandardSchemaValidationPipe } from '@nestjs/common'
import { standardSchemaExceptionFactory } from 'nestjs-mvc'

app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))
```

```ts
import { z } from 'zod'

const ContactSchema = z.object({
  user: z.object({ name: z.string().min(1), email: z.email() }),
  tags: z.array(z.string().min(1)),
})

@Post('contacts')
store(@Body({ schema: ContactSchema }) body: z.infer<typeof ContactSchema>) {
  // only runs with valid input
}
```

Each issue's path is joined with dots: `['user', 'email']` becomes `user.email`, `['tags', 0]` becomes `tags.0`. An issue without a path belongs to the whole value and is keyed `_form` (exported as `ROOT_ERROR_KEY`). When a path has several issues, the first one in the schema's order wins.

## Errors from your handler

Some checks only your handler can do, like "this email is already taken". Throw a `ValidationException` with the messages keyed by field, and the user gets them exactly like a failed pipe:

```ts
if (await this.users.emailTaken(dto.email)) {
  throw new ValidationException({ email: 'That email is already taken.' })
}
```

Use dot paths for nested fields (`'address.zip'`), and `_form` for a message that belongs to no field. A value can be a string or an array of strings. What you pass is used as it is, whatever the `messages` option says.

A `BadRequestException` whose body has an `errors` object works too: `throw new BadRequestException({ errors: { email: 'Taken.' } })`.

## What counts as a validation failure

The exception filter looks at every `BadRequestException` and tries to find field errors in it, in this order:

1. A `ValidationException`: its errors, as they are.
2. An `errors` object in the response body: kept as they are (string and string array values only).
3. A `message` object, which is what `ValidationPipe({ errorFormat: 'grouped' })` produces: keyed by path, reduced by the `messages` option.
4. A `message` array, Nest's default: a message like `"user.email: Invalid email"` (the Standard Schema pipe) is split at the colon, and otherwise the first word is the field (`"email must be an email"` goes to `email`). Reduced by the `messages` option.

With the factories you never depend on the last guess. A `BadRequestException` without any field errors (like `new BadRequestException('Nope')`) is not a validation failure. It goes to Nest's default handling, or your [error page](/docs/error-pages).

## What happens on the wire

### An Inertia visit

The form's request carries `X-Inertia: true`. When validation fails, the handler never finishes, and the answer is a redirect to the page the request came from:

```http
POST /users HTTP/1.1
X-Inertia: true
Referer: https://app.example.com/users/create
```

```http
HTTP/1.1 302 Found
Location: https://app.example.com/users/create
Set-Cookie: mvc_flash=…; Path=/; Max-Age=300; HttpOnly; SameSite=Lax
```

* The status is `303` after `PUT`, `PATCH` and `DELETE`, and `302` otherwise, so the client follows it with a `GET`.
* The target is the `Referer`, but only when it points at this app. Otherwise it's `/`.
* The errors travel in the [flash store](/docs/flash), next to any flash data the handler queued before it threw.

The client follows the redirect, and the page renders with the errors:

```json
{
  "component": "Users/Create",
  "props": {
    "errors": { "email": "That is not an email address.", "address.zip": "Please enter a zip code." }
  },
  "url": "/users/create",
  "version": "a1b2c3"
}
```

That render uses them up. The next visit gets `errors: {}` again.

When the form named an error bag, the errors sit one level deeper, under the bag's name. See [Error bags](/docs/error-bags).

### Any other request

Without `X-Inertia` there is no redirect and nothing is stored. With the default `jsonStatus: 400`, Nest answers as usual. A `ValidationException` (and so both factories) gives:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": { "email": "That is not an email address." }
}
```

With `validation: { jsonStatus: 422 }`, any failure with field errors becomes Laravel's shape instead, which is what `useHttp()` and other clients built for Laravel expect:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
```

```json
{
  "message": "The given data was invalid.",
  "errors": { "email": "That is not an email address." }
}
```

This also applies to a first page load, since that has no `X-Inertia` header: a plain HTML form posted without the client gets JSON, not a redirect.

## The errors prop

Every page gets an `errors` prop:

* It's `{}` when there are no errors, never missing.
* It's always included, also on a [partial reload](/docs/partial-reloads) that doesn't ask for it. The client relies on that to keep the errors it shows during polls and deferred loads.
* It comes first, before the shared props and yours, so a prop called `errors` that you return replaces it.

With `messages: 'all'`, each field holds an array. Tell the client's types about it:

```ts
declare module '@inertiajs/core' {
  interface InertiaConfig {
    errorValueType: string[]
  }
}
```

Set `messages: 'all'` in both places when you want arrays everywhere: on the factory (for your pipes) and in `validation` (for the formats Nest's pipes produce without a factory, and for [Precognition](/docs/precognition)).

## On the page

`useForm` gets the errors in `onError` and keeps them in `form.errors`, keyed the same way:

{% framework-code %}
```tsx
import { useForm } from 'nestjs-mvc/react'

export default function Create() {
  const form = useForm({ user: { name: '', email: '' } })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.post('/contacts') }}>
      <input value={form.data.user.email} onChange={(e) => form.setData('user.email', e.target.value)} />
      {form.errors['user.email'] && <p>{form.errors['user.email']}</p>}
      <button disabled={form.processing}>Save</button>
    </form>
  )
}
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const form = useForm({ user: { name: '', email: '' } })
</script>

<template>
  <form @submit.prevent="form.post('/contacts')">
    <input v-model="form.user.email" />
    <p v-if="form.errors['user.email']">{{ form.errors['user.email'] }}</p>
    <button :disabled="form.processing">Save</button>
  </form>
</template>
```
{% /framework-code %}

A redirect with errors counts as a failure on the client: it calls `onError`, not `onSuccess`, and the form keeps what the user typed.

## Files

Nest's `ParseFilePipe` throws a `BadRequestException` with a plain message and no field, so it isn't a validation failure here: an Inertia visit gets a `400` instead of an error next to the input. Check files in your handler and throw a `ValidationException` keyed by the file's field, as the [file uploads](/docs/file-uploads) guide does.

## Combining it with other features

* [Error bags](/docs/error-bags) put the errors of one form under its own key.
* [Precognition](/docs/precognition) runs the same pipes and the same factory while the user types, and answers `422` instead of redirecting.
* [Flash data](/docs/flash) the handler queued before the failure arrives with the errors.
* [Error pages](/docs/error-pages) can send errors back the same way, with `{ redirect: 'back', errors }`.

## Pitfalls

{% callout title="The factory is not optional for class-validator" type="warning" %}
Without `validationExceptionFactory`, the field of a class-validator message is guessed from its first word. That works for Nest's default messages (`"email must be an email"`), but not for your own ones like `"Please enter a name."`, which would land under `Please`. Use the factory.
{% /callout %}

* The redirect goes to the `Referer`. A browser or proxy that strips it sends the user to `/`.
* A check in your handler only runs on submit. [Precognition](/docs/precognition) never reaches your handler, so move such a check into your schema or a custom constraint if it has to run live.

## See also

* [Forms and validation](/docs/forms), the guide.
* [Error bags](/docs/error-bags), [Precognition](/docs/precognition) and [Flash data](/docs/flash).
