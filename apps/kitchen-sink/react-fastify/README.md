# Kitchen sink: React on Fastify

The [kitchen sink](..) on `@nestjs/platform-fastify`, at
http://localhost:3002. Everything except the files below is shared; the kitchen
sink's README explains what it demonstrates and how to test it.

```sh
pnpm build       # from the repo root, once: builds nestjs-mvc
pnpm dev         # from here, or `pnpm dev:fastify` from the repo root
pnpm test:e2e    # the shared Playwright suite, against this app
```

What is specific to Fastify:

- `src/main.ts`: `FastifyAdapter`; `@fastify/multipart` registered for uploads;
  `@fastify/static` registered and awaited in production, because
  `app.useStaticAssets()` never lets `listen()` finish on NestJS 12 with Fastify.
- `src/upload.controller.ts`: the file upload POST reads `req.parts()`, since
  Nest's `FileInterceptor` is Express only. The plugin's "file too large" error
  is turned into the 413 Express answers with; Nest would make it a 500.
