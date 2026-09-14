---
title: Server rendering
---

By default pages render in the browser. For pages that search engines must read, like a landing page or a blog, render them on the server with one decorator. {% .lead %}

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

The first response now contains the finished HTML of your page. React takes over in the browser as usual.

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

## Nothing to configure

There is no separate server to run and no config file. In development your pages render inside the Nest app. `vite build` also builds what the server needs for production.

## When to use it

Only where it helps:

* **Yes:** public pages that need to show up in search results or in link previews.
* **No:** pages behind a login. Search engines cannot see them, and rendering them in the browser is cheaper.

Server rendering only affects the first page load. Moving between pages afterwards works the same with or without it.

## If rendering fails

A page that fails to render on the server is not lost. nestjs-mvc logs the error and sends the page to render in the browser instead.

## Page titles

Titles and meta tags from [`Head`](/docs/layouts) are rendered on the server too, as long as your template calls `ctx.head()`.

## Decide per request

A guard or handler can override the decorator for one request:

```ts
this.view.disableSsr()
```

For example to skip server rendering for logged in users on a public page.

{% callout title="Check the source, not the inspector" %}
To see if a page was rendered on the server, use View Source in your browser. The element inspector shows the page after React has run, so it always looks rendered.
{% /callout %}
