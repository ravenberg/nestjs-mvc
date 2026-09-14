# Kitchen sink: React on Express

The [kitchen sink](..) on `@nestjs/platform-express`, at
http://localhost:3000. Everything except the files below is shared; the kitchen
sink's README explains what it demonstrates and how to test it.

```sh
pnpm build       # from the repo root, once: builds nestjs-mvc
pnpm dev         # from here (or the repo root)
pnpm test:e2e    # the shared Playwright suite, against this app
```

What is specific to Express:

- `src/main.ts`: `NestFactory.create<NestExpressApplication>()`, and
  `app.useStaticAssets()` for the build in production.
- `src/upload.controller.ts`: the file upload POST with Nest's `FileInterceptor`
  and `@UploadedFile()` (multer), which only exist for Express.
