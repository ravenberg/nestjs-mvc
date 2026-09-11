# Docs

The documentation site for nestjs-mvc, built with nestjs-mvc: a NestJS app
whose controllers render React pages over the Inertia protocol, server-side
rendered on every route. The design is the Tailwind Plus "Syntax" template,
ported to `nestjs-mvc/react`.

```sh
pnpm dev          # http://localhost:3001
pnpm build        # dist/client + dist/ssr
pnpm start:prod
```

## How a page is made

- `content/**/*.md` — Markdoc files with a `title` in the frontmatter. `/` is
  `content/index.md`; `/docs/<slug>` is `content/docs/<slug>.md`.
- `src/navigation.ts` — the sidebar, shared with every page as a prop.
- `src/docs/docs.service.ts` — reads a file, transforms it with the Markdoc
  schema in `src/docs/markdoc.ts` (headings get ids, fences and callouts
  become components), collects the table of contents, and builds the search
  index.
- `src/docs/docs.controller.ts` — `@Ssr()` on the class: every route renders
  on the server. `GET /search?q=` answers the search dialog with JSON.
- `frontend/pages/Docs/Page.tsx` — renders the tree with Markdoc's React
  renderer and the component map in `frontend/components/Markdown.tsx`.

Dark mode is a `dark` class on `<html>`, set before paint by a script in
`src/template.ts` and switched by the theme selector (`frontend/lib/theme.ts`).

The original template lives next to this app during the port and is not
committed (Tailwind Plus license: the template itself may not be
redistributed; a site built with it may be open source).
