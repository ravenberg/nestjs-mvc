---
title: Keeping data fresh
---

Some pages show data that changes while you look at it, like a queue of jobs or the status of a deploy. With `usePoll` the page asks for new data every few seconds, all by itself. {% .lead %}

## Refresh on a timer

`usePoll` reloads props on an interval you give in milliseconds. Here's a status page that checks the queue every five seconds:

{% framework-code %}
```tsx
import { usePoll } from 'nestjs-mvc/react'

export default function Status({ queue }: { queue: number }) {
  usePoll(5000, { only: ['queue'] })
  return <p>{queue} jobs waiting</p>
}
```

```vue
<script setup lang="ts">
import { usePoll } from 'nestjs-mvc/vue'

defineProps<{ queue: number }>()
usePoll(5000, { only: ['queue'] })
</script>

<template>
  <p>{{ queue }} jobs waiting</p>
</template>
```
{% /framework-code %}

On the server there's nothing special to do. The controller is the same one that renders the page:

```ts
@Get('status')
@View('Status')
status() {
  return {
    queue: () => this.jobs.countWaiting(),
    workers: () => this.workers.all(),
  }
}
```

Every tick is a [reload of some props](/docs/partial-reloads): the controller runs, only `queue` is sent, and the rest of the page stays as it is. The poll starts when the page shows and stops when the user leaves it.

## Always pass `only`

A tick without `only` reloads every prop on the page. That means all the queries behind it, every few seconds, and the data you [load later](/docs/loading-data) is dropped or fetched again each time.

So name the props that actually change. And since each tick calls your controller method, keep slow work [inside the prop functions](/docs/partial-reloads#your-controller-still-runs), where it's skipped when nobody asks for that prop.

## Values that change between ticks

The second argument can also be a function. It's called on every tick, so it can use the latest props. That's how you tell the server what the page already has:

{% framework-code %}
```tsx
export default function Chat({ messages }: { messages: Message[] }) {
  usePoll(3000, () => ({
    only: ['messages'],
    data: { after: messages.at(-1)?.id ?? 0 },
    preserveUrl: true,
  }))
  // ...
}
```

```vue
<script setup lang="ts">
const props = defineProps<{ messages: Message[] }>()

usePoll(3000, () => ({
  only: ['messages'],
  data: { after: props.messages.at(-1)?.id ?? 0 },
  preserveUrl: true,
}))
</script>
```
{% /framework-code %}

`data` ends up in the query string, where your controller reads it with `@Query('after')`. Without `preserveUrl`, that address would become the page's address: the address bar would show `/chat?after=41` and every tick would add an entry to the browser's history. `preserveUrl: true` keeps it at `/chat`.

## Add to a feed instead of replacing it

Normally each tick replaces the prop. For a chat or an activity feed you want the new items added to what's on screen. Wrap the prop in `merge()` and send only what's new:

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

Together with the poll above, every tick asks for the messages after the last one on screen, and they're added to the end of the list. Use `prepend()` when the newest items go at the top. [Growing lists](/docs/merging-props) explains the rest, like updating items the user already sees.

## Pause and resume

`usePoll` gives you `start`, `stop` and `polling`, which is handy for a pause button:

{% framework-code %}
```tsx
const { start, stop, polling } = usePoll(5000, { only: ['queue'] })

<button onClick={polling ? stop : start}>{polling ? 'Pause' : 'Resume'}</button>
```

```vue
<script setup lang="ts">
const { start, stop, polling } = usePoll(5000, { only: ['queue'] })
</script>

<template>
  <button @click="polling ? stop() : start()">{{ polling ? 'Pause' : 'Resume' }}</button>
</template>
```
{% /framework-code %}

To begin paused, pass `autoStart: false` in the third argument. The poll then waits until you call `start()`:

```ts
usePoll(5000, { only: ['queue'] }, { autoStart: false })
```

## In a background tab

When the user switches to another tab, there's no point checking every few seconds. The poll slows down to one in ten ticks, and goes back to the full rate once the tab is visible again.

For a page that has to stay current even when nobody's looking, like a board on a wall screen, pass `keepAlive: true`:

```ts
usePoll(5000, { only: ['queue'] }, { keepAlive: true })
```

## In detail

### When an answer is slow

By default a tick fires every interval, even when the previous one is still waiting for its answer. `mode` changes that:

```ts
usePoll(5000, { only: ['queue'] }, { mode: 'rest' })
```

- `'overlap'` (the default) fires every interval anyway.
- `'cancel'` cancels the tick that's still running and sends a new one.
- `'rest'` waits the full interval after each answer, so ticks never overlap. Pick this one when the query behind the prop can take longer than the interval.

### Errors on the page

A tick leaves validation errors that are already on the page alone. Someone fixing a form next to a live list keeps seeing what to fix, even when a tick comes back without errors.

### Quiet ticks

A tick doesn't show the progress bar, and if the user moves on to another page while one is on its way, its answer is dropped.
