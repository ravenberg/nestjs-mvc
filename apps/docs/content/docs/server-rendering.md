---
title: Server rendering
---

Pages normally render in the browser. For pages search engines need to read, like a landing page or a blog, you can render them on the server with one decorator. {% .lead %}

## Turn it on

Add `@Ssr()` to a handler:

```ts
import { Ssr, View } from 'nestjs-mvc'

@Controller()
export class HomeController {
  @Get()
  @View('Home')
  @Ssr()
  home() {
    return { headline: 'Welcome' }
  }
}
```

The first response now has the finished HTML of your page in it, and React takes over in the browser as usual.

## A whole controller

Put it on the controller to render every handler on the server:

```ts
@Controller('blog')
@Ssr()
export class BlogController {
  @Get()
  @View('Blog/Index')
  index() { /* ... */ }

  @Get('drafts')
  @View('Blog/Drafts')
  @Ssr(false)
  drafts() { /* this one stays in the browser */ }
}
```

## Setup

It works without a separate server or a config file. In development your pages render inside the Nest app, and `vite build` builds what the server needs for production too.

## When to use it

Use it where it actually helps:

* **Yes:** public pages that should show up in search results or link previews.
* **No:** pages behind a login. Search engines can't see those anyway, and rendering them in the browser costs less.

Server rendering only changes the first page load. Moving between pages after that works the same either way.

## If rendering fails

If a page fails to render on the server, nestjs-mvc logs the error and lets the browser render the page instead.

## Page titles

Titles and meta tags from [`Head`](/docs/layouts) are rendered on the server too, as long as your template calls `ctx.head()`.

## Decide per request

A guard or handler can switch it off for one request, for example to skip server rendering for logged in users on a public page:

```ts
this.view.disableSsr()
```

{% callout title="How to check it" %}
To see whether a page was rendered on the server, use View Source in your browser. The element inspector shows the page after React has run, so it'll always look rendered there.
{% /callout %}
