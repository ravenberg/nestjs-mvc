---
title: "@Ssr()"
---

`@Ssr()` renders a route's first page load on the server, so the HTML already contains the page before any JavaScript runs. It's off until a route asks for it. {% .lead %}

## Signature

```ts
import { Ssr } from 'nestjs-mvc'

Ssr(enabled = true): MethodDecorator & ClassDecorator
```

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | `true` opts in, `false` opts out (to override a controller). |

On a handler it covers that route. On a controller it covers every handler in it, and a handler can opt back out with `@Ssr(false)`:

```ts
@Controller('blog')
@Ssr()
export class BlogController {
  @Get()
  @View('Blog/Index')
  index() { /* server rendered */ }

  @Get('drafts')
  @View('Blog/Drafts')
  @Ssr(false)
  drafts() { /* rendered in the browser */ }
}
```

`@Ssr()` only matters on handlers that also have [`@View()`](/docs/view).

## Who decides

Three levels, most specific first. The first one that says something wins:

1. **Runtime:** `ViewService.enableSsr()` or `disableSsr()` during the request, from a guard, interceptor or the handler.
2. **Decorator:** `@Ssr()` or `@Ssr(false)` on the handler, else on its controller.
3. **Default:** off.

So an app without `@Ssr()` anywhere never renders on the server, whatever the `ssr` options say. And `enableSsr()` can opt a single request in on a route with no decorator at all.

```ts
@Get()
@View('Home')
@Ssr()
home(@Req() req: AnyRequest & { user?: User }) {
  // Logged in users get the browser rendered version
  if (req.user) this.view.disableSsr()
  return { headline: 'Welcome' }
}
```

## What is rendered when

Server rendering only happens on a first load: a request without the `X-Inertia` header, answered with HTML. Every Inertia visit (a link click, a form, a partial reload, a prefetch) gets the JSON page object, whatever the decorator says. The browser renders those as usual.

On a first load that is server rendered, the renderer:

1. resolves the props and builds the page object, exactly as it would otherwise;
2. hands the page object to your SSR entry, which returns `{ head: string[], body: string }`;
3. puts that into your template: `ctx.head()` returns the `head` elements joined by newlines, and `ctx.body()` returns `body` in place of the usual script element and empty root element.

`body` has to include the page object script and the root element itself; the SSR entry that the `nestjsMvc()` Vite plugin generates does that for you. The browser then picks up the page from that HTML and takes over.

Props you [defer](/docs/defer) are not in the page object on a first load, so they aren't in the server rendered HTML either. The browser fetches them after it takes over.

```ts
MvcModule.forRoot({
  vite: {},
  template: (page, ctx) => `<!DOCTYPE html>
<html>
<head>
${ctx.assets()}
${ctx.head()}
</head>
<body>${ctx.body()}</body>
</html>`,
})
```

The default template already calls `ctx.head()` and `ctx.body()`.

## Renderers

How a page is rendered is set with the `ssr` module option. With the `nestjsMvc()` Vite plugin none of it is needed. The service picks the first of these that applies:

1. **Vite, in development.** When the in process Vite dev server runs, the entry (`ssr.entry`, else the one the plugin generates) is loaded through Vite's `ssrLoadModule` on every render, so your edits show up right away.
2. **A standalone server**, only when `ssr.url` is set. The page object is sent as JSON in a `POST` to `<url>/render`, which must answer `{ head, body }`.
3. **The built bundle**, imported into the Nest process. `ssr.bundle`, else `dist/ssr/ssr.js` (which `vite build` writes with the plugin). A relative path resolves against the Vite `root`, else `process.cwd()`. It's imported once per process.

In development the default bundle is not a fallback: when the dev server runs without an entry and you set neither `ssr.url` nor `ssr.bundle`, rendering fails with a message about the missing configuration.

```ts
MvcModule.forRoot({
  vite: {},
  ssr: {
    entry: 'frontend/ssr.tsx',   // your own entry, instead of the generated one
    bundle: 'dist/ssr/ssr.js',   // where production finds it
    url: undefined,              // set to use a standalone SSR server
    timeout: 5000,               // ms, for the standalone server
    onError: (error) => logger.warn(error.message),
  },
})
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `entry` | `string` | the plugin's generated entry | The SSR entry for development, relative to the Vite root. Its default export (or a `render` export) takes the page object and returns `{ head, body }`. |
| `bundle` | `string` | `'dist/ssr/ssr.js'` | The built entry for production. Same export shape. |
| `url` | `string` | unset | A standalone SSR server. When set, it's used instead of the bundle. |
| `timeout` | `number` | `5000` | Milliseconds before a request to the standalone server is given up. |
| `onError` | `(error: SsrError) => void` | logs a warning | Called when a render fails. |

## Failures

A failed render never fails the response. The page is sent with the usual script element and empty root, and the browser renders it, as if the route hadn't opted in. The status stays `200`.

What counts as a failure: the entry or bundle can't be loaded or has no function export, the render throws, it returns no `body` string, the standalone server can't be reached or times out, or it answers with an error status.

Each failure is reported once per render. By default that's a warning in the `MvcSsr` log:

```text
SSR failed for Home at /: window is not defined (falling back to client-side rendering)
```

With `onError`, your function is called instead of the log. It gets an `SsrError`:

| Field | Meaning |
| --- | --- |
| `message` | What went wrong. |
| `type` | `'browser-api'`, `'component-resolution'`, `'render'`, `'connection'` or `'unknown'`. |
| `component`, `url` | The page that failed. |
| `hint`, `stack`, `sourceLocation`, `browserApi` | Extra detail, when the renderer has it. |

In process renders report `type: 'render'`. The finer types come from a standalone server's error response, and `'connection'` from not reaching it.

## Combining it with other features

* **Error pages** don't follow the route's decorator. An error page is server rendered only when the page you return from `errorPages` sets `ssr: true` (or a runtime `enableSsr()` call said so earlier in the request). See [Error pages](/docs/error-pages).
* **Titles and meta tags** from `Head` end up in `head`, as long as your template calls `ctx.head()`. See [Layouts and titles](/docs/layouts).

## Pitfalls

{% callout title="The timeout is for the standalone server only" type="warning" %}
`timeout` applies to `ssr.url`. A render in process (the Vite entry or the bundle) has no time limit, so a component that awaits something slow holds up the response.
{% /callout %}

* **Browser only code breaks the render.** Code that touches `window` or `document` while rendering throws on the server. The page still works, rendered by the browser, but you lose the server rendered HTML. Keep those calls in effects or mounted hooks.
* **Check with View Source.** The element inspector shows the page after JavaScript ran, so it always looks rendered.

## See also

* [Server rendering](/docs/server-rendering), the guide.
* [@View()](/docs/view) and [ViewService](/docs/view-service).
* [Going to production](/docs/production), for building the bundle.
