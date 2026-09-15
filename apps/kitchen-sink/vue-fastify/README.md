# Kitchen sink: Vue on Fastify

The [kitchen sink](..) with its Vue pages (`../shared/vue`) on
`@nestjs/platform-fastify`, at http://localhost:3006. Everything except
the files below is shared; the kitchen sink's README explains what it
demonstrates and how to test it.

```sh
pnpm build       # from the repo root, once: builds nestjs-mvc
pnpm dev         # from here, or `pnpm dev:vue-fastify` from the repo root
pnpm test:e2e    # the shared Playwright suite, against this app
```

The app itself is three files: `src/main.ts` calls the shared
`platform/fastify/bootstrap.ts`, `src/app.module.ts` adds that platform's upload
controller, and `vite.config.ts` uses `@vitejs/plugin-vue`. Framework detection
picks Vue because this package.json declares `vue`.
