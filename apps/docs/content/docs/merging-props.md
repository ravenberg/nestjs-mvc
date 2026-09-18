---
title: Growing lists
---

Normally a reload replaces a prop. For something like a chat or an activity feed, you want new items added to the list instead. {% .lead %}

## Add to the end

Wrap the prop in `merge()`:

```ts
import { View, merge } from 'nestjs-mvc'

@Get()
@View('Chat')
chat(@Query('after') after?: string) {
  return {
    messages: merge(() => this.messages.after(Number(after ?? 0))),
  }
}
```

Now a reload adds the new messages after the ones on screen:

```ts
router.reload({ only: ['messages'], data: { after: lastId }, preserveUrl: true })
```

The `data` goes into the query string, so without `preserveUrl` the address bar would change to `/chat?after=41`, and every reload would add an entry to the browser's history. Someone who refreshes the page would then only see the messages after 41. `preserveUrl: true` keeps the address at `/chat`.

## Add to the front

If the newest items go at the top, use `prepend()`:

```ts
import { prepend } from 'nestjs-mvc'

notifications: prepend(() => this.notifications.newerThan(since))
```

## Update items you already have

Sometimes an item changes after it's been shown, like a message someone edited. If you tell nestjs-mvc how to recognize an item, it replaces the one it already has instead of adding it twice:

```ts
messages: merge(() => this.messages.changedSince(since), { matchOn: 'id' })
```

## Nested objects

`deepMerge()` merges objects key by key, and the lists inside them too:

```ts
import { deepMerge } from 'nestjs-mvc'

board: deepMerge(() => this.board.changes(since), { matchOn: 'columns.id' })
```

## Start over

When the user changes a filter, the old items need to go, so reset the prop:

```ts
router.reload({ only: ['messages'], reset: ['messages'] })
```

{% callout title="Paging through a long list?" %}
For "load more when I scroll down", use [infinite scroll](/docs/infinite-scroll). It works the same way underneath and keeps track of the page numbers for you.
{% /callout %}

## In detail

### When does the list grow?

Only when you reload some of the props (with `only`, `except` or `reset`) and the answer is for the same page. Anything else replaces the prop: clicking a link to the page you're on, or a `router.reload()` that doesn't name any props. So if your list suddenly shows only the newest items, check that the reload names the prop in `only`.

### Send only what's new

The server doesn't remember what the browser already has, so it's up to you to work out what's new, usually from a query parameter like `after`. If your function returns the whole list every time, every reload adds all of it again. Return only the new items, or set `matchOn` so repeated items replace the ones that are there.

Your function only runs when the prop is actually needed: on the first visit, and on a reload that asks for it.

### Updating items at the front

`matchOn` works with `prepend()` too, but differently: the old copy of the item is removed and the new one goes to the front with the others. So a message someone edited jumps to the top of the list instead of staying where it was.

### A list inside an object

If the prop is an object with the list under a key, like `{ data: [...], total: 340 }`, name that key:

```ts
feed: merge(() => this.feed.after(since), { append: ['data'], matchOn: 'data.id' })
```

Use `prepend: ['data']` to add to the front instead. `matchOn` starts from the prop, so it includes `data`. Without `append`, a prop that's an object is merged only one level deep: the new keys replace the old ones, lists and all.

### How deepMerge() treats each value

Objects are merged key by key, at any depth. Lists are added to the end, or matched when `matchOn` points at them. Anything else, like a number or a string, is replaced. A deep merge never adds to the front.

### Resetting

`reset` on its own is enough to ask for the prop, so you don't have to name it in `only` as well. Name the prop itself: for the `feed` above that's `reset: ['feed']`, and `reset: ['feed.data']` doesn't reset it.

### Together with other helpers

A helper can't wrap another one. `defer(() => merge(...))` sends the helper itself to the page instead of your data. Put the merge prop inside an object that the deferred function returns:

```ts
feed: defer(() => ({ items: merge(this.feed.latest()) }))
```

When you [refresh on a timer](/docs/polling) with `only`, every tick is a reload of those props, so a merge prop grows on each tick.
