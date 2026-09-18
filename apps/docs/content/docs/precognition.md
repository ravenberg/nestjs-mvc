---
title: Precognition
---

Precognition validates a form against the real route while the user types: the server runs the route's pipes, answers with the verdict, and never calls the handler. {% .lead %}

## Usage

There is nothing to turn on. `MvcModule` registers `PrecognitionInterceptor` globally, so every route answers precognitive requests with the pipes it already has:

```ts
@Post('users')
async store(@Body() dto: CreateUserDto) {
  // Precognition never gets here
  await this.users.create(dto)
  return this.view.redirect('/users')
}
```

On the client, give `useForm` the method and URL before the data, as in `useForm('post', '/users', { name: '', email: '' })`. See [On the page](#on-the-page).

## What happens on the wire

A precognitive request is the form's normal request plus one header. The client also says which fields it wants to hear about:

```http
POST /users HTTP/1.1
Precognition: true
Precognition-Validate-Only: name,email
Content-Type: application/json

{"name":"Ada","email":"nope"}
```

| Header | Meaning |
| --- | --- |
| `Precognition: true` | Validate, don't handle. Only the exact value `true` counts. |
| `Precognition-Validate-Only` | Optional, comma separated. Only errors for these fields are reported. A name also covers its nested paths: `user` reports `user.name` and `user.email`. |

When the reported fields pass:

```http
HTTP/1.1 204 No Content
Precognition: true
Precognition-Success: true
Vary: Precognition
```

When they don't:

```http
HTTP/1.1 422 Unprocessable Entity
Precognition: true
Vary: Precognition
Content-Type: application/json
```

```json
{ "message": "The given data was invalid.", "errors": { "email": "That is not an email address." } }
```

A precognitive request never gets a redirect. The error keys are the same dot paths as on a real submit, one message per field unless `validation.messages` is `'all'` (see [Validation](/docs/validation)).

Every response of a route, precognitive or not, gets `Vary: Precognition`, so a cache never serves one kind for the other.

## What runs

`PrecognitionInterceptor` doesn't call the handler. It runs the same pipes Nest would run for it, in the same order, on the same values:

1. Global pipes (`app.useGlobalPipes()`).
2. `@UsePipes()` on the controller.
3. `@UsePipes()` on the handler.
4. The parameter's own pipes, like `@Param('id', ParseIntPipe)`.

It does this for every `@Body()`, `@Query()` and `@Param()` parameter, with the parameter's type and its `schema` (so `@Body({ schema })` is validated too). Other parameters, like `@Headers()`, `@UploadedFile()` or your own parameter decorators, are skipped. Pipe classes are taken from Nest's container when they're registered there, and constructed otherwise.

What decides the verdict:

* A pipe throws a `BadRequestException` with field errors: those errors are collected. When several parameters fail, the first message for a field wins.
* A pipe throws anything else, or a `BadRequestException` without field errors (like `ParseIntPipe` on a route param that isn't a number): it isn't a verdict, and the request fails as it normally would, with a `400` in that example.
* Nothing throws: success.

The verdict is thrown as an `MvcPrecognition` error, and the exception filter writes the `204` or `422` above.

Guards run before interceptors, so they run for precognitive requests too. A guard that rejects answers with its own status (or your [error page](/docs/error-pages), when `errorPages` handles it): a `401` stays a `401` rather than a redirect to the login page, and a stale [CSRF token](/docs/csrf) gives a `419`.

## On the page

`useForm(method, url, data)` returns a form with validation helpers. Call `validate` when a field loses focus:

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
      {form.valid('email') && <p>Looks good.</p>}

      <button disabled={form.processing || form.validating}>Register</button>
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
    <p v-else-if="form.valid('email')">Looks good.</p>

    <button :disabled="form.processing || form.validating">Register</button>
  </form>
</template>
```
{% /framework-code %}

| Helper | What it does |
| --- | --- |
| `validate(field?, config?)` | Marks the field as touched and validates. Without a field, validates the fields in `config.only`, or else every touched field. |
| `touch(...fields)` | Marks fields as touched without validating. |
| `touched(field?)` | Whether the field (or, without one, any field) is touched. |
| `valid(field)` / `invalid(field)` | Whether the field was validated and passed, or has an error. |
| `validating` | `true` while a check is running. |
| `setValidationTimeout(ms)` | The debounce between checks, `1500` by default. |
| `validateFiles()` | Includes files in checks (see below). |
| `withAllErrors()` | Keeps every message per field as an array. The server only sends more than one with `validation.messages: 'all'`. |
| `forgetError(field)` / `setErrors(errors)` | Changes the errors by hand. |
| `submit()` | Sends the real request to the same method and URL. |

### Which fields are checked

The client sends every touched field in `Precognition-Validate-Only`, not only the one you just validated. The server reports errors for those fields and ignores the rest, so fields the user hasn't reached yet don't light up. A field is only checked again when its value changed since the last check.

The whole form is always sent, so rules that compare fields (like a password confirmation) see both values.

### Files

By default the client leaves files out of precognitive requests and doesn't validate a file field. `validateFiles()` sends them. Check file uploads on the real submit instead; see [Pitfalls](#pitfalls).

## Combining it with other features

* [Validation](/docs/validation): the same factory, the same keys. A failure here and on submit look the same to the form.
* [Error bags](/docs/error-bags): not used. The `422` is always flat, and the client doesn't send `X-Inertia-Error-Bag` for a check.
* The real submit is an ordinary Inertia visit: redirect back with the `errors` prop when it fails.

## Pitfalls

{% callout title="Pipes run on every check" type="warning" %}
Every check runs your pipes. A pipe that writes to the database, sends an email or counts attempts does that each time a field loses focus. Keep pipes free of side effects.
{% /callout %}

* Checks in your handler, like a `ValidationException` for "this email is taken", only happen on submit. To check them live, move them into a pipe: an async constraint in class-validator, or an async `refine` in Zod.
* Route level interceptors don't run either, because `PrecognitionInterceptor` is global and stops the request first. Anything such an interceptor prepares for your pipes, like a parsed multipart body from `FileInterceptor`, is missing. That's why files are best checked on submit.
* A route without any pipes on its parameters always answers `204`.

## See also

* [Live validation](/docs/live-validation), the guide.
* [Validation](/docs/validation) and [Error bags](/docs/error-bags).
