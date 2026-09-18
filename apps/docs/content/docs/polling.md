---
title: Polling
---

`usePoll` reloads the page's props on a timer. Each tick is an ordinary reload of the current URL, so on the server it's your controller answering a request, with nothing special to set up. {% .lead %}

## Signature

```ts
usePoll(
  interval: number,
  requestOptions?: ReloadOptions | (() => ReloadOptions),
  options?: {
    keepAlive?: boolean
    autoStart?: boolean
    mode?: 'overlap' | 'cancel' | 'rest'
  },
): { start: () => void; stop: () => void; polling: boolean }
```

{% framework name="react" %}`polling` is a boolean state value.{% /framework %}{% framework name="vue" %}`polling` is a `Ref<boolean>`.{% /framework %}

| Argument | Type | Default | Meaning |
|---|---|---|---|
| `interval` | `number` | required | Milliseconds between ticks. |
| `requestOptions` | `ReloadOptions` or a function returning them | `{}` | What each tick asks for, as for `router.reload()`: `only`, `except`, `data`, `headers`, `reset`, callbacks. A function is called again on every tick, so it can use current values. |
| `keepAlive` | `boolean` | `false` | Keep the full rate while the tab is in the background. |
| `autoStart` | `boolean` | `true` | Start when the component mounts. With `false`, call `start()` yourself. |
| `mode` | `'overlap'`, `'cancel'` or `'rest'` | `'overlap'` | What to do when a tick is still waiting for its response. |

The modes:

* `overlap`: a tick fires every `interval`, whether the previous one finished or not.
* `cancel`: a new tick cancels the request of the previous one if it is still running.
* `rest`: the next tick is planned `interval` after the previous one finished, so requests never overlap.

`stop()` stops the timer and `start()` starts it again. The poll is destroyed when the component unmounts. Outside a component, `router.poll(interval, requestOptions, options)` does the same and returns `{ start, stop, destroy }`.

## Each tick is a reload

A tick calls the client's reload with these settings: the URL the browser is on, `async: true` (so no progress bar), state and scroll kept, `preserveErrors: true`, and a `Cache-Control: no-cache` request header. Your `requestOptions` go on top.

With `only`, the tick is a partial reload:

```http
GET /status HTTP/1.1
X-Inertia: true
X-Inertia-Version: 1a2b3c
X-Inertia-Partial-Component: Status
X-Inertia-Partial-Data: queue
Cache-Control: no-cache
```

```json
{
  "component": "Status",
  "props": { "errors": {}, "queue": 12 },
  "url": "/status",
  "version": "1a2b3c"
}
```

Without `only` or `except`, a tick is a full reload of the page: every prop is resolved again (`optional()` props are still skipped), deferred props are left out and announced again, and the client replaces the props and then fetches the deferred ones again. Pass `only` unless you really want all of that every few seconds.

## What the server sees

* Nothing marks a request as a poll. It's the same request as `router.reload()`, so your handler can't tell them apart, and doesn't have to.
* The route runs as usual: middleware, guards, pipes and the handler. The handler runs on every tick; only the closures of props that aren't asked for are skipped. Put expensive work in closures.
* `always()` props, like the validation `errors` nestjs-mvc adds, come with every tick even when `only` doesn't name them.
* `once()` props the browser holds are listed in `X-Inertia-Except-Once-Props`, as on any visit.
* A tick renders a page, so it reads and clears the flash bag like any other render.

### After a deploy or a change of user

When the asset version changed, the server answers a tick with `409` and `X-Inertia-Location`. A change of user gets the same kind of answer. For a background request like a tick, the client sees that the version changed and does not reload the page on its own: the next visit the user makes does.

## Background tabs

Without `keepAlive`, a poll slows down while the tab is hidden: it fires on the first tick after the tab goes to the background and then on every tenth tick. When the tab is visible again, it goes back to every tick. With `keepAlive: true` it keeps firing on every tick.

## Responses the client drops

A tick's response is thrown away when the user has meanwhile gone to another page (another component, or another path). Going to another page also cancels a tick that is still running for the current page.

## On the page

{% framework-code %}
```tsx
import { usePoll } from 'nestjs-mvc/react'

export default function Status({ queue }: { queue: number }) {
  const { start, stop, polling } = usePoll(5000, { only: ['queue'] }, { mode: 'rest' })

  return (
    <>
      <p>{queue} jobs waiting</p>
      <button onClick={polling ? stop : start}>{polling ? 'Pause' : 'Resume'}</button>
    </>
  )
}
```

```vue
<script setup lang="ts">
import { usePoll } from 'nestjs-mvc/vue'

defineProps<{ queue: number }>()

const { start, stop, polling } = usePoll(5000, { only: ['queue'] }, { mode: 'rest' })
</script>

<template>
  <p>{{ queue }} jobs waiting</p>
  <button @click="polling ? stop() : start()">{{ polling ? 'Pause' : 'Resume' }}</button>
</template>
```
{% /framework-code %}

## Combining it with other features

### merge()

A tick with `only` is a partial reload, so a [merge prop](/docs/merge) is merged into the list on every tick. Use the function form to send a cursor from the current props, and `preserveUrl` so the cursor doesn't end up in the address bar:

```ts
@Get()
@View('Chat')
chat(@Query('after') after?: string) {
  return {
    messages: merge(() => this.messages.after(Number(after ?? 0)), { matchOn: 'id' }),
  }
}
```

{% framework-code %}
```tsx
import { usePoll } from 'nestjs-mvc/react'

export default function Chat({ messages }: Props) {
  usePoll(3000, () => ({
    only: ['messages'],
    data: { after: messages.at(-1)?.id ?? 0 },
    preserveUrl: true,
  }))

  return <MessageList messages={messages} />
}
```

```vue
<script setup lang="ts">
import { usePoll } from 'nestjs-mvc/vue'

const props = defineProps<{ messages: { id: number; body: string }[] }>()

usePoll(3000, () => ({
  only: ['messages'],
  data: { after: props.messages.at(-1)?.id ?? 0 },
  preserveUrl: true,
}))
</script>

<template>
  <MessageList :messages="messages" />
</template>
```
{% /framework-code %}

Without `preserveUrl`, `data` goes into the query string and each tick's response URL (`/chat?after=41`) becomes the page's URL.

### always()

An [always() prop](/docs/always) is sent with every tick, even when `only` names something else. That's handy for a small status that every response should refresh, but it also means its value is computed on every tick. Keep it cheap.

### once()

A tick with `only` that doesn't name a [once() prop](/docs/once-props) doesn't touch it. A tick without `only` skips it while the browser holds a copy.

## Pitfalls

{% callout title="Pass only" type="warning" %}
A tick without `only` resolves every prop of the page and fetches the deferred ones again. On a page with slow queries, that is a lot of work every few seconds.
{% /callout %}

* The handler itself runs on every tick. Work outside prop closures (logging a view, loading an entity) happens every time.
* `data` on a tick changes the page's URL unless you pass `preserveUrl: true`.
* The interval is in milliseconds.

## See also

* [Loading data later](/docs/loading-data), the guide
* [Partial reloads](/docs/partial-reloads)
* [merge(), prepend(), deepMerge()](/docs/merge)
* [always()](/docs/always)
