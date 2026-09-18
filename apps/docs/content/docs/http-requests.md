---
title: Requests that aren't pages
---

Sometimes a page needs a bit of data without going anywhere, like results while the user types. You ask a controller route for JSON, and the page stays exactly as it is. {% .lead %}

## When a page visit is too much

Clicking a link or submitting a form is a page visit: the server answers with a page, its props replace the old ones, and the URL and history move along.

That's too much for a search box that shows matches as you type, an autocomplete that suggests contacts, or a command palette. There you only want a small answer, and the page, its props and the history should stay as they are.

## A route that answers with data

A controller route without `@View()` answers like any NestJS route: the object you return is sent as JSON.

```ts
// src/contacts/contacts.controller.ts
import { Controller, Get, Query } from '@nestjs/common'

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get('search')
  async search(@Query('q') q = '') {
    const term = q.trim().slice(0, 100)
    if (!term) return []

    const found = await this.contacts.search(term, { limit: 8 })
    return found.map((contact) => ({ id: contact.id, name: contact.name, email: contact.email }))
  }
}
```

Your guards run on it like on any other route, so a logged in user only finds what they're allowed to see. Return only the fields the page needs, since all of it ends up in the browser.

## Ask for it from the page

`useHttp` works like `useForm`, except that the answer is data instead of a page:

{% framework-code %}
```tsx
import { useEffect } from 'react'
import { useHttp } from 'nestjs-mvc/react'

type Contact = { id: number; name: string; email: string }

export function ContactSearch() {
  const search = useHttp<{ q: string }, Contact[]>({ q: '' })

  useEffect(() => {
    if (!search.data.q.trim()) return
    const timer = setTimeout(() => {
      search.cancel()
      search.get('/contacts/search').catch(() => {
        // Cancelled by the next keystroke: keep the last results.
      })
    }, 200)
    return () => clearTimeout(timer)
  }, [search.data.q])

  return (
    <div>
      <input value={search.data.q} onChange={(e) => search.setData('q', e.target.value)} />
      {search.processing && <p>Searching…</p>}
      <ul>
        {search.response?.map((contact) => <li key={contact.id}>{contact.name}</li>)}
      </ul>
    </div>
  )
}
```

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useHttp } from 'nestjs-mvc/vue'

type Contact = { id: number; name: string; email: string }

const search = useHttp<{ q: string }, Contact[]>({ q: '' })

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => search.q,
  (q) => {
    clearTimeout(timer)
    if (!q.trim()) return
    timer = setTimeout(() => {
      search.cancel()
      search.get('/contacts/search').catch(() => {
        // Cancelled by the next keystroke: keep the last results.
      })
    }, 200)
  },
)
</script>

<template>
  <input v-model="search.q" />
  <p v-if="search.processing">Searching…</p>
  <ul>
    <li v-for="contact in search.response" :key="contact.id">{{ contact.name }}</li>
  </ul>
</template>
```
{% /framework-code %}

{% framework name="react" %}
* `search.data` holds the values, and `search.setData` changes one.
{% /framework %}

{% framework name="vue" %}
* The values are properties of `search` itself, so `v-model="search.q"` binds an input to one.
{% /framework %}

* `search.get(url)` sends the values in the query string, here as `/contacts/search?q=ada`. `post`, `put`, `patch` and `delete` send them as JSON in the body.
* `search.response` holds the answer of the last request that worked. Each call also returns it, as a promise.
* `search.processing` is `true` while a request runs.
* `search.cancel()` stops the running request, so an older answer can't overwrite a newer one. The cancelled call's promise fails, which is why there's a `catch`.

The wait of 200 milliseconds means the server gets one request when the user pauses, not one per key.

When the user picks a result, that's a normal page visit again, like `router.visit('/contacts/42')`.

## Save something without leaving the page

The same works for changes. Say the contact picker lets you add a new contact on the spot. The route validates like any form and returns the new contact:

```ts
@Post('quick')
async quickAdd(@Body() dto: CreateContactDto) {
  const contact = await this.contacts.create(dto)
  return { id: contact.id, name: contact.name, email: contact.email }
}
```

{% framework-code %}
```tsx
const contact = useHttp<{ name: string; email: string }, Contact>({ name: '', email: '' })

function add(e: React.FormEvent) {
  e.preventDefault()
  contact.post('/contacts/quick', {
    onSuccess: (created) => onPick(created),
  })
}

// in the form: {contact.errors.email && <p>{contact.errors.email}</p>}
```

```vue
<script setup lang="ts">
import { useHttp } from 'nestjs-mvc/vue'

const emit = defineEmits<{ pick: [contact: Contact] }>()
const contact = useHttp<{ name: string; email: string }, Contact>({ name: '', email: '' })

function add() {
  contact.post('/contacts/quick', {
    onSuccess: (created) => emit('pick', created),
  })
}
</script>

<template>
  <form @submit.prevent="add">
    <input v-model="contact.email" />
    <p v-if="contact.errors.email">{{ contact.errors.email }}</p>
  </form>
</template>
```
{% /framework-code %}

For the errors to show up on the form, turn on one option. A request like this isn't sent back to a page when validation fails; by default it gets a `400`, and `useHttp` treats that as any other failed request. With `jsonStatus: 422` it gets a `422` with the errors, and `useHttp` puts them on its form:

```ts
MvcModule.forRoot({ validation: { jsonStatus: 422 } })
```

Then a failed DTO, or a `ValidationException` from your handler, fills `contact.errors` like it does for `useForm`. The `onError` callback runs instead of `onSuccess`, and the promise resolves without an answer. [Validation](/docs/validation) has more on the errors themselves.

## When the user isn't logged in

A page visit to a protected route goes to the login page when nobody is logged in. These requests don't: they ask for JSON, so they get a plain `401`, and your page decides what to do.

The session might have run out while the page was open, for example. A simple answer is to reload the page, which is a page visit, so it goes to the login page like any other and remembers where the user was:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

search
  .get('/contacts/search', {
    onHttpException: (response) => {
      if (response.status === 401) router.reload()
    },
  })
  .catch(() => {})
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

function find() {
  search
    .get('/contacts/search', {
      onHttpException: (response) => {
        if (response.status === 401) router.reload()
      },
    })
    .catch(() => {})
}
</script>
```
{% /framework-code %}

Other error statuses, like a `403` or a `500`, come to `onHttpException` the same way. The promise fails for all of them, so keep a `catch`.

## CSRF

`useHttp` sends the [CSRF](/docs/csrf) token along with every request, just like `useForm`, so a `POST` from your page passes the check without extra code. `GET` requests aren't checked at all.

When the token has expired, the request gets a plain `419` instead of the "page expired" message, together with a fresh token in the cookie. Sending the request again works.

## In detail

### What counts as a request for data

A request gets the page treatment (the login redirect, errors sent back to the form) when it's a page visit, or when a browser loads the URL directly. A request with `X-Requested-With: XMLHttpRequest`, or one that doesn't accept HTML, wants data and gets a status code instead. `useHttp` sends both `Accept: application/json` and that header. For a plain `fetch()`, set `Accept: application/json` yourself.

### Return data, not a redirect

A handler for these requests should return data. A redirect would be followed to a whole page, and that's not the JSON `useHttp` is waiting for, so the request fails.

### Checking while the user types

`useHttp` also takes the method and URL up front, as in `useHttp('post', '/contacts/quick', { name: '', email: '' })`. Then it can check fields before the user submits, the same way as [live validation](/docs/live-validation).
