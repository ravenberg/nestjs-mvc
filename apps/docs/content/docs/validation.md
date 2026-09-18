---
title: Validation
---

Validation decides whether what a form sends is good enough to save. You write the rules once on the server, and every message ends up next to the field it belongs to. {% .lead %}

[Forms and validation](/docs/forms) shows the basics. This guide picks up from there: choosing a library, checks that need your database, nested data, and what other clients get back.

## Pick a library

You can write your rules as DTO classes with class-validator, or as a schema with any library that follows Standard Schema, like Zod, Valibot or ArkType. Both work the same way from the page's point of view.

Either way, you add one pipe in `main.ts` and give it an exception factory from `nestjs-mvc`. The pipe checks the data, and the factory turns what failed into messages keyed by field, so nestjs-mvc can send them back to the form.

## With class-validator

This is the setup from [installation](/docs/installation):

```ts
// src/main.ts
import { ValidationPipe } from '@nestjs/common'
import { validationExceptionFactory } from 'nestjs-mvc'

app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
```

Your rules live on a class, and the handler names it as the type of its body:

```ts
// src/contacts/create-contact.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator'

export class CreateContactDto {
  @IsNotEmpty({ message: 'Please enter a name.' })
  name: string

  @IsEmail({}, { message: 'That is not an email address.' })
  email: string
}
```

```ts
@Post()
async store(@Body() dto: CreateContactDto) {
  await this.contacts.create(dto)
  return this.view.redirect('/contacts')
}
```

## With Zod

NestJS's `StandardSchemaValidationPipe` checks any parameter you give a schema. Its factory is `standardSchemaExceptionFactory`:

```ts
// src/main.ts
import { StandardSchemaValidationPipe } from '@nestjs/common'
import { standardSchemaExceptionFactory } from 'nestjs-mvc'

app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))
```

Then pass the schema to `@Body()`:

```ts
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().trim().min(1, 'Please enter a name.'),
  email: z.string().trim().toLowerCase().pipe(z.email('That is not an email address.')),
})

@Post()
async store(@Body({ schema: ContactSchema }) contact: z.infer<typeof ContactSchema>) {
  await this.contacts.create(contact)
  return this.view.redirect('/contacts')
}
```

Your handler gets what the schema made of the input, so the email arrives trimmed and in lowercase.

The pipe leaves parameters without a schema alone, and `ValidationPipe` skips a body typed with `z.infer`. So you can register both pipes side by side, for example while you move from one library to the other:

```ts
app.useGlobalPipes(
  new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
  new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }),
)
```

## Checks in your handler

Some rules need the database, like "this email is already taken". Your DTO or schema can't know that, so check it in the handler or a service, and throw a `ValidationException` with the message under the field's name:

```ts
import { ValidationException } from 'nestjs-mvc'

@Post()
async store(@Body() dto: CreateContactDto) {
  if (await this.contacts.emailTaken(dto.email)) {
    throw new ValidationException({ email: 'That email is already taken.' })
  }
  await this.contacts.create(dto)
  return this.view.redirect('/contacts')
}
```

The user gets it exactly like a failed DTO: back to the form, with the message next to the email field. You can name several fields in one exception, and your messages are used as you wrote them.

## Nested fields and lists

Errors are keyed by a dot path. When an `address` object has a bad `zip`, the error is under `address.zip`. When the second line of an order has a bad `quantity`, it's under `lines.1.quantity`, because lists count from zero.

With Zod, nested objects and arrays need nothing extra. With class-validator, mark nested objects with `@ValidateNested()` and tell class-transformer which class they are:

```ts
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, Min, ValidateNested } from 'class-validator'

class OrderLineDto {
  @IsInt()
  @Min(1, { message: 'Order at least one.' })
  quantity: number
}

class AddressDto {
  @IsNotEmpty({ message: 'Please enter a zip code.' })
  zip: string
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto

  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[]
}
```

On the page, read them with the same path, as in `form.errors['address.zip']` or `form.errors['lines.1.quantity']`. When you throw a `ValidationException` yourself, use the same paths too.

## Errors that belong to no field

Some messages are about the form as a whole, like "Enter a phone number or an email address". Those go under `_form`.

A schema check without a path ends up there, and you can throw one yourself:

```ts
const ContactSchema = z
  .object({ name: z.string(), phone: z.string(), email: z.string() })
  .refine((c) => c.phone || c.email, 'Enter a phone number or an email address.')

throw new ValidationException({ _form: 'This contact was archived in the meantime.' })
```

On the page, you find it in the `errors` prop:

{% framework-code %}
```tsx
import { usePage } from 'nestjs-mvc/react'

export function FormError() {
  const { errors } = usePage().props
  return errors._form ? <p role="alert">{errors._form}</p> : null
}
```

```vue
<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'

const page = usePage()
</script>

<template>
  <p v-if="page.props.errors._form" role="alert">{{ page.props.errors._form }}</p>
</template>
```
{% /framework-code %}

The "This page has expired" message from [CSRF protection](/docs/csrf) comes under `_form` as well, so this spot shows that too.

## Two forms on one page

Say an account page has a profile form and a password form, and both have a `name` field. Give each submit its own error bag, as in `profile.put('/account/profile', { errorBag: 'profile' })`. Nothing changes on the server. Each form still reads its own `form.errors.name`, and the errors of one never show up in the other.

If you read the raw `errors` prop from `usePage()` instead, the bag's name is an extra level in front: `errors.profile.name`, or `errors.profile._form` for a message that belongs to no field.

## Every message instead of the first

By default each field gets one message, the first rule that failed. To get all of them as a list, ask the factory for them:

```ts
import { createStandardSchemaExceptionFactory, createValidationExceptionFactory } from 'nestjs-mvc'

new ValidationPipe({ exceptionFactory: createValidationExceptionFactory({ messages: 'all' }) })
new StandardSchemaValidationPipe({ exceptionFactory: createStandardSchemaExceptionFactory({ messages: 'all' }) })
```

If some of your pipes don't use a factory, set it on the module too, so their errors come as lists as well:

```ts
MvcModule.forRoot({ validation: { messages: 'all' } })
```

Each field in `form.errors` is then an array of strings. A `ValidationException` you throw yourself is sent as you wrote it, so pass arrays there too if your page expects them. For [requests that aren't pages](/docs/http-requests), `useHttp` keeps the first message of each list unless you call its `withAllErrors()`.

## Requests that don't come from your pages

A mobile app or a script that posts JSON isn't sent back to a form. It gets a `400` with the errors in the body, under `errors`:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": { "email": "That is not an email address." }
}
```

If that client expects a `422` with `{ message, errors }`, ask for it:

```ts
MvcModule.forRoot({ validation: { jsonStatus: 422 } })
```

It then gets `{ "message": "The given data was invalid.", "errors": { ... } }`. That's also what `useHttp` needs to put the errors on its form, so turn it on when your pages make [requests that aren't pages](/docs/http-requests).

## In detail

### Why the factory matters

Without `validationExceptionFactory`, the field of a class-validator message is guessed from its first word. That works for NestJS's default messages, like "email must be an email", but your own "Please enter a name." would end up under `Please`. With the factory every message lands on the right field.

The Standard Schema pipe puts the path in front of each message, so most of its messages land on the right field even without a factory. A message without a path is the exception: only `standardSchemaExceptionFactory` puts it under `_form`.

### Errors that aren't about fields

A `BadRequestException` without any field in it, like `new BadRequestException('Nope')`, isn't treated as a validation error. It goes to your [error page](/docs/error-pages) instead of back to the form.
