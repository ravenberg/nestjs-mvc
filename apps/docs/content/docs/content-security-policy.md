---
title: Content Security Policy
---

A Content Security Policy tells the browser which scripts it's allowed to run, and nestjs-mvc makes sure its own scripts pass yours. {% .lead %}

## Why a nonce

A strict policy blocks every script you haven't approved. You approve them with a nonce, which is a random value in the policy header that each script tag has to carry as well. Someone who injects a script doesn't know that value, so their script won't run.

## Set the header with helmet

Use [helmet](https://www.npmjs.com/package/helmet), like the NestJS docs recommend, and get the nonce from nestjs-mvc:

```ts
// src/main.ts
import helmet from 'helmet'
import { nonce } from 'nestjs-mvc'

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", (req) => `'nonce-${nonce(req)}'`],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'ws:'],
      },
    },
  }),
)
```

Every script tag nestjs-mvc renders now carries that nonce, including the ones Vite adds while you're developing.

## Scripts of your own

If you need an inline script in your template, use `ctx.nonce`:

```ts
export function template(page: PageObject, ctx: TemplateContext) {
  return `<!DOCTYPE html>
<html>
<head>
  ${ctx.assets()}
  <script nonce="${ctx.nonce}">window.appVersion = '1.4.0'</script>
</head>
<body>${ctx.body()}</body>
</html>`
}
```

## Without helmet

If your policy is set somewhere else, like a proxy, turn the nonce on for every page:

```ts
MvcModule.forRoot({ vite: {}, csp: { nonce: true } })
```

## Good to know

* **Styles are trickier.** Inline `style` attributes can't carry a nonce, so keep `'unsafe-inline'` for styles like in the example above, unless you never use inline styles.
* **`ws:` is there for development.** Vite uses a websocket to reload your pages when you save a file.
* **Don't cache HTML pages at a CDN** when you use a nonce. A cached page has an old nonce that won't match the header anymore.
