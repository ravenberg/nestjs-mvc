---
title: Optimistic updates
---

Some changes almost always work. Instead of waiting for the server, you can change the page right away and let the server's answer confirm it. {% .lead %}

## Change the page first

Say you have a board of support tickets in three columns: open, waiting and closed. Moving a ticket sends a `PATCH`, and the controller saves the new status and sends the user back to the board:

```ts
@Patch(':id')
async move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveTicketDto) {
  await this.tickets.move(id, dto.status)
  return this.view.back()
}
```

On its own, the ticket stays in its old column until the answer arrives. On a slow connection that's long enough for the user to wonder whether the drag worked.

So tell the page what the result will be. Put `router.optimistic()` in front of the request, with a function that gets the page's props and returns the ones that change:

{% framework-code %}
```tsx
import { router } from 'nestjs-mvc/react'

function move(ticket: Ticket, status: Ticket['status']) {
  router
    .optimistic<{ tickets: Ticket[] }>((props) => ({
      tickets: props.tickets.map((t) => (t.id === ticket.id ? { ...t, status } : t)),
    }))
    .patch(`/tickets/${ticket.id}`, { status })
}
```

```vue
<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'

function move(ticket: Ticket, status: Ticket['status']) {
  router
    .optimistic<{ tickets: Ticket[] }>((props) => ({
      tickets: props.tickets.map((t) => (t.id === ticket.id ? { ...t, status } : t)),
    }))
    .patch(`/tickets/${ticket.id}`, { status })
}
</script>
```
{% /framework-code %}

The ticket jumps to its new column the moment the request starts. Your function gets a copy of the props, and only the props you return are changed. Everything else on the page stays as it is.

## When the server agrees

The request runs like any other, and the server answers with the board as it's saved now. Those props replace your guess. Usually they're the same, so nothing visibly changes. If the server did something extra, like setting the time the ticket was closed, the page picks that up.

## When the server refuses

Say closed tickets can't be reopened:

```ts
const ticket = await this.tickets.find(id)
if (ticket.status === 'closed') {
  throw new ValidationException({ status: 'A closed ticket stays closed.' })
}
```

The user is sent back to the board with that error, like after a [form](/docs/forms) that didn't validate, and your change is undone: the ticket moves back to the closed column. You don't write any code for that. Whenever the request doesn't succeed, whether the server refuses it, it fails or the connection drops, the props you changed go back to how they were.

If the server answers with an [error page](/docs/error-pages), for example a `403`, that page shows, like after any other visit.

## From a form

`useForm` has the same `optimistic()`. Say a ticket page lists its comments, with a form underneath to add one. The new comment can show up before the server has saved it:

{% framework-code %}
```tsx
import { useForm } from 'nestjs-mvc/react'

export default function Show({ ticket, comments }: Props) {
  const form = useForm({ body: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form
      .optimistic<{ comments: Comment[] }>((props) => ({
        comments: [...props.comments, { id: Date.now(), body: form.data.body, author: 'You' }],
      }))
      .post(`/tickets/${ticket.id}/comments`, { onSuccess: () => form.reset() })
  }
  // ...the comments and the form
}
```

```vue
<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'

const props = defineProps<{ ticket: Ticket; comments: Comment[] }>()
const form = useForm({ body: '' })

function submit() {
  form
    .optimistic<{ comments: Comment[] }>((page) => ({
      comments: [...page.comments, { id: Date.now(), body: form.body, author: 'You' }],
    }))
    .post(`/tickets/${props.ticket.id}/comments`, { onSuccess: () => form.reset() })
}
</script>
```
{% /framework-code %}

The comment gets a temporary id so the list can show it. When the answer arrives, the real list with the real id takes its place. If the comment is refused, it disappears again and the error shows under the field, with the text still in the form.

## Ask only for what changed

After the `PATCH`, the server redirects back to the board, and the browser loads the whole board page again. If that page also shows statistics that take a while to work out, they're worked out again for nothing.

Name the props you changed in `only`:

```ts
router
  .optimistic<{ tickets: Ticket[] }>((props) => ({ /* ... */ }))
  .patch(`/tickets/${ticket.id}`, { status }, { only: ['tickets'] })
```

The browser follows the redirect with the same request, so the page that comes back is a reload of just `tickets`, the same as in [Loading only what you need](/docs/partial-reloads). Make those props functions in your controller, so the queries of the other props don't run at all.

When the change also affects [data on every page](/docs/shared-data), like a count of open tickets in the menu, name that prop too: `only: ['tickets', 'openTickets']`.

This works when the redirect leads back to the page the user is on. A redirect to a different page brings that whole page, like always.

## In detail

### Several changes at once

The user can move three tickets in a row without waiting. Each move sends its own request, and none of them cancels another. While any of them is still on its way, the page keeps showing all your changes, so a card doesn't flicker back when the first answer comes in. When one of them is refused, only that change is undone and the others stay.

### Clicking on while it's saving

Clicking a link doesn't cancel an optimistic request. If the user goes to another page before the answer arrives, the change is still saved on the server, and the answer is left unused because the user has moved on.

The progress bar shows while the request runs, like for a normal visit.

### Returning nothing

If your function returns nothing, or props that are the same as before, the page isn't changed. The request is sent anyway.

### As an option

Instead of chaining `optimistic()`, you can pass the function as the `optimistic` option of the request, as in `router.patch(url, data, { optimistic: (props) => ({ ... }) })` or `form.post(url, { optimistic: ... })`.

The `Form` component takes it as its `optimistic` prop. There the function gets the form's values as a second argument, after the props.

### Requests that aren't pages

`useHttp` has an `optimistic()` too, but it works on the values the hook holds rather than on the page's props, since there's no page coming back. If the request fails, those values go back to how they were before it. See [Requests that aren't pages](/docs/http-requests).

### When not to use it

Guessing only makes sense when you can guess right. For changes that often fail, or where a wrong guess misleads someone, like a payment going through, wait for the server instead.
