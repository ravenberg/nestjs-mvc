---
title: Infinite scroll
---

Load the next page of a list when the user scrolls to the bottom. {% .lead %}

## The controller

Wrap the list in `scroll()`. Your function returns one page of rows and tells nestjs-mvc which pages come before and after it.

```ts
import { Controller, Get, Query } from '@nestjs/common'
import { View, scroll } from 'nestjs-mvc'

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @View('Posts/Index')
  index(@Query('page') page = '1') {
    const current = Number(page)

    return {
      posts: scroll(async () => {
        const [rows, total] = await this.posts.findPage(current, 20)
        return {
          data: rows,
          currentPage: current,
          previousPage: current > 1 ? current - 1 : null,
          nextPage: current * 20 < total ? current + 1 : null,
        }
      }),
    }
  }
}
```

The rows go under `data`. On the last page `nextPage` is `null`, and that tells the browser to stop.

## The page

Wrap the list in `InfiniteScroll` and name the prop:

{% framework-code %}
```tsx
import { InfiniteScroll } from 'nestjs-mvc/react'

interface Props {
  posts: { data: { id: number; title: string }[] }
}

export default function Index({ posts }: Props) {
  return (
    <InfiniteScroll data="posts">
      {posts.data.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </InfiniteScroll>
  )
}
```

```vue
<script setup lang="ts">
import { InfiniteScroll } from 'nestjs-mvc/vue'

defineProps<{ posts: { data: { id: number; title: string }[] } }>()
</script>

<template>
  <InfiniteScroll data="posts">
    <article v-for="post in posts.data" :key="post.id">{{ post.title }}</article>
  </InfiniteScroll>
</template>
```
{% /framework-code %}

As the end of the list comes into view, the browser asks your controller for `?page=2` and adds those rows under the ones it already has.

## Starting in the middle

If you open `/posts?page=5`, the list starts at page 5. Scrolling down loads page 6, and scrolling up puts page 4 in front.

## Filters

When a filter changes, the list has to start over, or the new results get added to the old ones. Pass `reset` for that:

```ts
router.get('/posts', { tag }, { only: ['posts'], reset: ['posts'] })
```

## Extra information

Anything else you return next to `data` gets to the page as it is, which is handy for something like "Showing 20 of 340":

```ts
return { data: rows, total, currentPage: current, previousPage, nextPage }
```

## In detail

### Page numbers and cursors

A page can be named by a number (a page number, an offset) or by a string (a cursor). The browser sends it back in the `page` query parameter. If you'd rather call it something else, return `pageName: 'cursor'` next to the rows, and read `cursor` in your handler: nestjs-mvc doesn't read the parameter for you, so the two names have to match.

`null` for `nextPage` or `previousPage` means there's nothing on that side. The browser treats `0` and an empty string the same way, so if you page by offset, the first page's offset of `0` also reads as "nothing before".

### The shape of what you return

Your function returns an object with the rows in an array under `data`. A bare array makes the request fail with an error that tells you so. If your rows are under another key, say which one:

```ts
posts: scroll(() => this.posts.page(current), { wrapper: 'items' })
```

Already have a paginator that returns its own shape? Keep it, and tell `scroll()` where to find the pages:

```ts
posts: scroll(() => this.posts.paginate(current), {
  metadata: (result) => ({
    pageName: 'page',
    currentPage: result.meta.page,
    previousPage: result.meta.page > 1 ? result.meta.page - 1 : null,
    nextPage: result.meta.page < result.meta.pageCount ? result.meta.page + 1 : null,
  }),
})
```

The rows still have to be under `data` (or your `wrapper`), because that's the list the browser adds to.

### What the browser asks for

When it loads the next page, the browser asks your controller for the current URL with the page parameter set, so filters that are already in the URL go along. It only asks for the list, so the functions of your other props don't run.

If a page can come back with rows the browser already has, set `matchOn: 'id'`. A row with the same id then replaces the old one instead of showing up twice.

### The address bar follows along

While the user scrolls, the browser keeps `?page=` in the address bar on the page that fills most of the screen, without asking the server for anything. Page 1 takes the parameter away again. That's why a refresh can open the list in the middle, and why your handler has to give a correct `previousPage` for any page it starts on.

To keep the address bar as it is, set {% framework name="react" %}`preserveUrl`{% /framework %}{% framework name="vue" %}`preserve-url`{% /framework %} on `InfiniteScroll`.

The browser also remembers which pages it loaded in its history, so when the user comes back to the list with the back button, it carries on where they left off.

### Loading in one direction

`InfiniteScroll` loads both ways by default. {% framework name="react" %}`onlyNext`{% /framework %}{% framework name="vue" %}`only-next`{% /framework %} only loads further down, and {% framework name="react" %}`onlyPrevious`{% /framework %}{% framework name="vue" %}`only-previous`{% /framework %} only further up. With `params` you can pass extra reload options for every page it loads, like more props to ask for in `only`.

### Loading the first page later

To show the page before the list is ready, pass `defer: true` (or the name of a group) instead of wrapping `scroll()` in `defer()`:

```ts
posts: scroll(() => this.posts.page(current), { defer: true })
```

Then wrap `InfiniteScroll` in `Deferred`, because it needs the first page to know where it is:

{% framework-code %}
```tsx
<Deferred data="posts" fallback={<p>Loading posts…</p>}>
  <InfiniteScroll data="posts">
    {posts?.data.map((post) => <article key={post.id}>{post.title}</article>)}
  </InfiniteScroll>
</Deferred>
```

```vue
<Deferred data="posts">
  <template #fallback>
    <p>Loading posts…</p>
  </template>
  <InfiniteScroll data="posts">
    <article v-for="post in posts?.data" :key="post.id">{{ post.title }}</article>
  </InfiniteScroll>
</Deferred>
```
{% /framework-code %}

Without `Deferred`, `InfiniteScroll` throws an error as soon as it shows up.
