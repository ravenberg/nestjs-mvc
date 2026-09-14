---
title: Infinite scroll
---

Load the next page of a list when the user scrolls to the bottom. {% .lead %}

## The controller

Wrap the list in `scroll()`. The function returns one page of rows and tells nestjs-mvc which pages come before and after it.

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

Your rows go under `data`. `nextPage` is `null` on the last page, which tells the browser to stop.

## The page

Wrap the list in `InfiniteScroll` and name the prop:

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

When the end of the list comes into view, the browser asks your controller for `?page=2` and adds those rows below the ones it has.

## Starting in the middle

Open `/posts?page=5` and the list starts at page 5. Scrolling down loads page 6, and scrolling up loads page 4 in front.

## Filters

When a filter changes, the list must start over. Otherwise the new results are added to the old ones. Pass `reset`:

```tsx
router.get('/posts', { tag }, { only: ['posts'], reset: ['posts'] })
```

## Extra information

Anything else you return next to `data` reaches the page unchanged. Use it for "Showing 20 of 340":

```ts
return { data: rows, total, currentPage: current, previousPage, nextPage }
```
