---
title: TypeScript
---

Your controllers and your pages are both TypeScript, so the data that travels between them can be typed on both ends. {% .lead %}

## Type a page's props

Give each page a `Props` interface that describes what its controller returns:

{% framework-code %}
```tsx
// frontend/pages/Invoices/Show.tsx
interface Props {
  invoice: { id: number; number: string; total: number; paidAt: string | null }
}

export default function Show({ invoice }: Props) {
  return <h1>Invoice {invoice.number}</h1>
}
```

```vue
<!-- frontend/pages/Invoices/Show.vue -->
<script setup lang="ts">
interface Props {
  invoice: { id: number; number: string; total: number; paidAt: string | null }
}

defineProps<Props>()
</script>

<template>
  <h1>Invoice {{ invoice.number }}</h1>
</template>
```
{% /framework-code %}

Props arrive as JSON, so a `Date` on the server is a string on the page. That's why `paidAt` is a `string` here.

## Share the shape with the controller

The interface above is a promise the controller has to keep, and nothing checks that it does. Put the shape in one file that both sides import, and TypeScript tells you when they drift apart:

```ts
// src/invoices/invoice.types.ts
export interface InvoiceView {
  id: number
  number: string
  total: number
  paidAt: string | null
}

export interface ShowInvoiceProps {
  invoice: InvoiceView
}
```

```ts
// src/invoices/invoices.controller.ts
import type { ShowInvoiceProps } from './invoice.types'

@Get(':id')
@View('Invoices/Show')
async show(@Param('id', ParseIntPipe) id: number): Promise<ShowInvoiceProps> {
  const invoice = await this.invoices.find(id)
  return {
    invoice: { id: invoice.id, number: invoice.number, total: invoice.total, paidAt: invoice.paidAt?.toISOString() ?? null },
  }
}
```

{% framework-code %}
```tsx
// frontend/pages/Invoices/Show.tsx
import type { ShowInvoiceProps } from '../../../src/invoices/invoice.types'

export default function Show({ invoice }: ShowInvoiceProps) {
  return <h1>Invoice {invoice.number}</h1>
}
```

```vue
<!-- frontend/pages/Invoices/Show.vue -->
<script setup lang="ts">
import type { ShowInvoiceProps } from '../../../src/invoices/invoice.types'

defineProps<ShowInvoiceProps>()
</script>

<template>
  <h1>Invoice {{ invoice.number }}</h1>
</template>
```
{% /framework-code %}

Use `import type` on the page. It disappears when the page is built, so no server code ends up in the browser. Keep that file to types only, for the same reason.

## Props that come later

A prop wrapped in `defer()` or `optional()` is a helper on the server and data on the page, so one interface can't describe both sides. Share the pieces instead, and pass the type to the helper:

```ts
return {
  invoice: toInvoiceView(invoice),
  payments: defer<PaymentView[]>(() => this.payments.forInvoice(id)),
}
```

Every helper takes the type of its data like this. TypeScript usually works it out from the function, but naming it checks that the function really returns what the page expects.

On the page the prop is missing until it arrives, so mark it optional:

```ts
interface Props {
  invoice: InvoiceView
  payments?: PaymentView[]
}
```

## Data on every page

The logged in user and your other [shared data](/docs/shared-data) are on every page. Rather than typing them on each page, declare them once in a setup file:

```ts
// frontend/types/global.d.ts
import '@inertiajs/core'

declare module '@inertiajs/core' {
  export interface InertiaConfig {
    sharedPageProps: {
      appName: string
      auth: { user: { id: number; name: string } | null }
    }
  }
}
```

`@inertiajs/core` holds the types of the browser side, and it's installed along with it. You only name it here.

Now `usePage()` knows about them everywhere, without a type argument. For a page's own props, pass them as before:

{% framework-code %}
```tsx
import { usePage } from 'nestjs-mvc/react'

const { props } = usePage<{ invoices: InvoiceView[] }>()
props.auth.user?.name // string | undefined
props.invoices        // InvoiceView[]
```

```vue
<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'

const page = usePage<{ invoices: InvoiceView[] }>()
page.props.auth.user?.name // string | undefined
page.props.invoices        // InvoiceView[]
</script>
```
{% /framework-code %}

`auth.user` is whatever your `auth.share` returns, and `null` for a guest. To keep the two in step, give `share` a return type from your shared types file and use the same type in the setup file.

## Flash messages and errors

The same interface types your [flash messages](/docs/flash-messages) and the values in `errors`:

```ts
declare module '@inertiajs/core' {
  export interface InertiaConfig {
    flashDataType: { message?: string; invoice?: { id: number; total: number } }
    errorValueType: string[]
  }
}
```

With that, `flash.message` is a `string` instead of `unknown`. Only set `errorValueType` when you've asked for [every message](/docs/validation#every-message-instead-of-the-first), because by default each field has a single `string`.

## Typing forms

`useForm` takes its types from the values you start with. That's usually enough, but an empty string or a `null` doesn't tell TypeScript much. Pass the type yourself in that case:

{% framework-code %}
```tsx
import { useForm } from 'nestjs-mvc/react'

interface InviteForm {
  name: string
  role: 'admin' | 'member' | ''
  avatar: File | null
}

const form = useForm<InviteForm>({ name: '', role: '', avatar: null })
form.setData('role', 'admin')  // fine
form.setData('role', 'owner')  // error: not a role
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

interface InviteForm {
  name: string
  role: 'admin' | 'member' | ''
  avatar: File | null
}

const form = useForm<InviteForm>({ name: '', role: '', avatar: null })
form.role = 'admin'  // fine
form.role = 'owner'  // error: not a role
</script>
```
{% /framework-code %}

`form.errors` then only has keys for your fields, including nested ones like `form.errors['address.city']`. A form with [live validation](/docs/live-validation) takes the same type: `useForm<InviteForm>('post', '/invitations', { ... })`.

## Types on the server

The helpers are generic, as you saw with `defer<PaymentView[]>()`. `defer()`, `optional()`, `once()` and `scroll()` take a function. `always()` and `merge()` also take a plain value, and `PropValue<T>` is the name for that: a value, or a function that returns one (or a promise of one). It's handy when you write a small helper of your own:

```ts
import { always, requestState, type AnyRequest, type PropValue } from 'nestjs-mvc'

export function shareFresh<T>(req: AnyRequest, key: string, value: PropValue<T>) {
  requestState(req).shared[key] = always(value)
}
```

`auth.share` and `auth.id` take your own user type, so you don't need a cast:

```ts
MvcModule.forRoot({
  auth: { share: (user: User): AuthUser => ({ id: user.id, name: user.name }) },
})
```

## Your frontend's compiler options

Your pages have a config of their own, which the [installation](/docs/installation#type-script) sets up. The setup file with your shared data sits in `frontend`, so that config picks it up too.

## In detail

### With pnpm

pnpm only lets you import packages you installed yourself, so TypeScript can't find `@inertiajs/core` from your setup file. Add it to your own dependencies, at the same version your lockfile already has.

### What types can't see

Types check your code, not what happens at runtime. A controller that doesn't declare its return type, a prop you forgot in `auth.share` or a typo in `@View('Invoices/Shw')` all compile fine. An [end-to-end test](/docs/testing) that visits the page catches those.

### Flash data on the server

`flash()` on the server accepts any value, so it isn't checked against `flashDataType`. Use the same keys on both sides, or keep them in a small shared constant.
