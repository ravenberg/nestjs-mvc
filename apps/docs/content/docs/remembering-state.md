---
title: Remembering state
---

Some state only lives in the page: which tab is open, which columns a table shows, a reply someone is halfway through typing. The page can remember it, so it's still there when the user comes back with the back button. {% .lead %}

## What gets lost

Filters and page numbers usually sit in the address, so they come back with it. Anything you saved on the server comes back with the props. The rest is state inside your components, and that starts over whenever the page is shown again.

Say an orders page lets the user pick which columns to show. They hide "Customer", open an order, and press back. The page comes back with its props, but the columns are the default ones again.

## Remember a value

`useRemember` works like a normal piece of component state, with a key. Every change is written into the page's entry in the browser's history, and when the user comes back to that entry, the value is read from there instead of starting from the initial one:

{% framework-code %}
```tsx
import { useRemember } from 'nestjs-mvc/react'

const ALL = ['customer', 'total', 'status', 'placedAt']

export default function Index({ orders }: Props) {
  const [columns, setColumns] = useRemember(['customer', 'total', 'status'], 'Orders/columns')

  function toggle(column: string) {
    setColumns(columns.includes(column) ? columns.filter((c) => c !== column) : [...columns, column])
  }
  // ...a checkbox per column, and the table
}
```

```vue
<script setup lang="ts">
import { useRemember } from 'nestjs-mvc/vue'

const ALL = ['customer', 'total', 'status', 'placedAt']

defineProps<{ orders: Order[] }>()
const columns = useRemember(['customer', 'total', 'status'], 'Orders/columns')
</script>

<template>
  <label v-for="column in ALL" :key="column">
    <input type="checkbox" :value="column" v-model="columns" /> {{ column }}
  </label>
  <!-- ...the table -->
</template>
```
{% /framework-code %}

Now the user can hide a column, open an order, press back, and find the table as they left it.

The key is what the value is saved under. Each page has its own entry in the history, so the key only has to be unique within one page. Naming it after the page and the thing, like `Orders/columns`, keeps it clear.

## Remember a form

Give `useForm` a key as its first argument, and it remembers what's typed into it, along with any errors:

{% framework-code %}
```tsx
import { useForm } from 'nestjs-mvc/react'

export default function Show({ ticket }: Props) {
  const form = useForm('Tickets/Reply', { body: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.post(`/tickets/${ticket.id}/replies`, {
      onSuccess: () => form.setData('body', ''),
    })
  }
  // ...the reply form
}
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const props = defineProps<{ ticket: Ticket }>()
const form = useForm('Tickets/Reply', { body: '' })

function submit() {
  form.post(`/tickets/${props.ticket.id}/replies`, {
    onSuccess: () => {
      form.body = ''
    },
  })
}
</script>
```
{% /framework-code %}

A support agent can start a reply, click through to the customer's last order to check something, and come back to their reply with the back button.

Empty the form once the reply is sent. The page the user lands on after sending keeps what was remembered, so without that the old reply would still be sitting there.

## Leave out secrets

What you remember stays in the browser's history for as long as the tab is open, and anyone who uses that browser after you can go back to it. So never remember a password or a card number. Name those fields in `dontRemember`, and the rest of the form is still remembered:

{% framework-code %}
```tsx
import { useForm } from 'nestjs-mvc/react'

const form = useForm('Account/Email', { email: '', password: '' }).dontRemember('password')
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const form = useForm('Account/Email', { email: '', password: '' }).dontRemember('password')
</script>
```
{% /framework-code %}

For pages with private data, also look at [private history](/docs/history-encryption).

## How long it lasts

What you remember belongs to one entry in the tab's history, so it lasts as long as that entry:

* Back and forward bring it back, even when the user left your site in between and returns with the back button.
* Going to the page again, for example from the menu, is a new entry, so it starts from the initial value.
* A full reload of the page forgets it.
* Closing the tab forgets it.

## In detail

### Staying on the same page

A visit that shows the same page again keeps what's remembered when it preserves the state. Forms do that by default, so after a failed or a successful submit that lands on the same page, everything is still there. A filter that uses `router.get` keeps it when you add `preserveState: true`, like in [Links](/docs/links). Without it, the page starts over.

### Two of the same

The key is shared by everything on the page that uses it. If one component appears twice, say two tables that each remember their columns, give each its own key, like `Orders/columns:open` and `Orders/columns:shipped`.

Always pass a key to `useRemember`. Without one, every call on the page uses the same default key.

### What can be remembered

The value is stored by the browser with the history entry, so keep it to plain data: strings, numbers, booleans, arrays and objects of those.

### With private history

When a page uses [private history](/docs/history-encryption), what you remember is encrypted along with its props. Once the key is thrown away, for example when the user logs out, the page can't read its entry any more and loads fresh from the server, so the remembered values are gone too.
