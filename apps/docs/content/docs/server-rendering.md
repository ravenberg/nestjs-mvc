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

The first response now has the finished HTML of your page in it, and your page takes over in the browser as usual.

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
To see whether a page was rendered on the server, use View Source in your browser. The element inspector shows the page after its JavaScript has run, so it'll always look rendered there.
{% /callout %}

## In detail

### Which one wins

A call to `disableSsr()` or `enableSsr()` during the request wins over the decorators. After that, `@Ssr()` on the handler wins over the one on its controller. Without any of these, the page renders in the browser.

So `enableSsr()` can also switch it on for one request on a route that has no decorator at all.

### What's in the rendered HTML

Only the first page load is rendered on the server. When someone clicks a link, submits a form or reloads some props, the browser gets data and renders the page itself, whatever the decorator says.

Props you [load after the page shows](/docs/loading-data) aren't part of the first load, so they aren't in the server rendered HTML either. The browser fetches them once it has taken over.

### Code that only works in the browser

On the server there's no `window` or `document`. A component that touches them while it renders fails there, so the user gets the page rendered by the browser and search engines don't get the finished HTML. Keep that code in {% framework name="react" %}`useEffect`{% /framework %}{% framework name="vue" %}`onMounted`{% /framework %}, which only runs in the browser.

### When it fails

A failed render never breaks the page. The browser renders it instead, and the status stays `200`, so the only sign is a warning in your log:

```text
SSR failed for Home at /: window is not defined (falling back to client-side rendering)
```

To send those to your error tracker instead, pass `onError`:

```ts
MvcModule.forRoot({
  vite: {},
  ssr: { onError: (error) => errorTracker.capture(error) },
})
```

The error has a `message`, and the `component` and `url` of the page that failed.

### A slow page

Rendering happens inside your Nest app and has no time limit. A component that waits for something slow while it renders holds up the response for as long as it takes.

If you'd rather render in a separate server, set `ssr.url`. Your app then sends the page to `<url>/render` and gives up after `ssr.timeout` milliseconds (5000 by default), falling back to the browser.

### Your own template

If you've written your own `template`, it has to call `ctx.body()` where the page goes and `ctx.head()` in the `<head>`, or the rendered HTML has nowhere to go. The default template already does both.

### Error pages

An [error page](/docs/error-pages) doesn't follow the decorator of the route that failed. To render it on the server, set `ssr: true` on the page you return for it.
