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

```tsx
router.reload({ only: ['messages'], data: { after: lastId } })
```

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

```tsx
router.reload({ only: ['messages'], reset: ['messages'] })
```

{% callout title="Paging through a long list?" %}
For "load more when I scroll down", use [infinite scroll](/docs/infinite-scroll). It works the same way underneath and keeps track of the page numbers for you.
{% /callout %}
