---
title: Growing lists
---

By default a reload replaces a prop. For a chat or an activity feed you want new items added to the list instead. {% .lead %}

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

Newest first? Use `prepend()`:

```ts
import { prepend } from 'nestjs-mvc'

notifications: prepend(() => this.notifications.newerThan(since))
```

## Update items you already have

An item can change after it was shown, like a message that was edited. Tell nestjs-mvc how to recognize an item, and a known item is replaced in place instead of added twice:

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

When the user changes a filter, the old items must go. Reset the prop:

```tsx
router.reload({ only: ['messages'], reset: ['messages'] })
```

{% callout title="Paging through a long list?" %}
For "load more when I scroll down", use [infinite scroll](/docs/infinite-scroll). It is built on the same idea and handles the page numbers for you.
{% /callout %}
