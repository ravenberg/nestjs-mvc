---
title: Content Security Policy
---

A Content Security Policy tells the browser which scripts it may run. nestjs-mvc makes its own scripts pass your policy. {% .lead %}

## Why a nonce

A strict policy blocks every script that is not approved. You approve scripts with a nonce: a random value in the policy header that the same value on each script tag must match. An attacker who injects a script does not know the value, so their script does not run.

## Set the header with helmet

Use [helmet](https://www.npmjs.com/package/helmet), as the NestJS docs recommend, and ask nestjs-mvc for the nonce:

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

That is all. Every script tag nestjs-mvc renders now carries the same nonce, also the ones Vite adds while you develop.

## Scripts of your own

Need an inline script in your template? Use `ctx.nonce`:

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

* **Styles are harder.** React `style` attributes cannot carry a nonce. Keep `'unsafe-inline'` for styles, as in the example above, unless you avoid inline styles completely.
* **`ws:` is for development.** Vite uses a websocket to reload your pages when you save a file.
* **Do not cache HTML pages at a CDN** when you use a nonce. A cached page carries an old nonce that no longer matches the header.
