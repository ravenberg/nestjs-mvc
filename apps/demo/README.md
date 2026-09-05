# Demo app

A NestJS + React + Tailwind app used to exercise `nestjs-mvc` while developing the
adapter in [`packages/core`](../../packages/core). It is being built up into a
kitchen-sink clone of the official Inertia v3 demo: a mini-CRM plus one page per
protocol feature.

## Stack

- **Server**: NestJS (`src/`) on `http://localhost:3000`
- **Client**: React 19 + Vite + Tailwind v4 (`frontend/`), served by Nest itself — no second port
- **Data**: TypeORM + SQLite, seeded on first boot
- **Adapter**: `nestjs-mvc` (workspace package, linked via pnpm)

## Getting started

From the repo root:

```sh
pnpm install
pnpm build   # builds packages/core → dist/index.js, required before first run
pnpm dev
```

Open **http://localhost:3000**.

> ⚠️ The demo imports the workspace package `nestjs-mvc` from its built
> output (`packages/core/dist`), not from source. If you skip `pnpm build`
> (or run `pnpm dev` on a fresh clone), the server crashes with
> `ERR_MODULE_NOT_FOUND: .../nestjs-mvc/dist/index.js`. Re-run `pnpm build`
> whenever `dist/` is missing or stale.

## Runtime model

**One process, one port — in dev and in production.**

`pnpm dev` runs a single command: `tsx watch src/main.ts`. There is no
`concurrently`, no separate `vite` command and no `localhost:5173`. The
`vite` option on `MvcModule.forRoot()` (see [`src/app.module.ts`](src/app.module.ts))
boots Vite in *middleware mode* inside the Nest process:

| | Dev | Production |
|---|---|---|
| Processes | 1 | 1 |
| Ports | 1 (`:3000`, HMR websocket included) | 1 (`:3000`) |
| Client assets | Vite dev server, in-process, with HMR | Prebuilt `dist/client`, served by Nest under `/build/` |
| Tags | `<link>` to `/frontend/app.css` + `/@id/virtual:nestjs-mvc/client` + injected HMR client | `/build/assets/app-<hash>.css` + `/build/assets/client-<hash>.js` from the Vite manifest |

There is no `main.tsx` and no `ssr.tsx`: `nestjsMvc()` in
[`vite.config.ts`](vite.config.ts) generates both entries from `frontend/pages/`
and links `frontend/app.css` as a real stylesheet in both modes.

`ctx.assets()` in [`src/template.ts`](src/template.ts) emits the right tags for
whichever mode is active, so the template has no `NODE_ENV` branching. Vite is a
build-time dependency only — it is never loaded in production.

Reload behaviour while developing:

- Editing **`frontend/`** → Vite HMR, no server restart, React state preserved.
- Editing **`src/`** or **`packages/core/src`** → `tsx watch` restarts Nest
  (which tears down and recreates the in-process Vite server, ~0.5s).

## What to test

The app is a mini-CRM plus a Kitchen Sink of Inertia feature pages, mirroring the
official [`inertiajs/demo-v3`](https://github.com/inertiajs/demo-v3). Sidebar entries
without a link are on the roadmap and render muted.

| Page | URL | What it demonstrates |
|---|---|---|
| Dashboard | `/dashboard` | **Deferred props**: three counters are `defer()`-ed, so the page paints instantly with skeletons and the client fetches them in one follow-up partial request. `recentActivity` is eager. |
| Contacts | `/contacts` | **Infinite scroll**: `scroll()` over an offset paginator, 15 a page, appended as you scroll. Search + favourites filter reset the prop (`router.get(..., { only, reset: ['contacts'] })`) so the list starts over |
| Contact | `/contacts/:id` | **Deferred props**: the profile renders first, `notes` stream in after |
| Organizations | `/organizations` | List with a grouped contact count (one query, no N+1) |
| Organization | `/organizations/:id` | **Deferred + scroll**: `contacts` arrives in the follow-up request, then pages by keyset cursor (`?cursor=<id>`) behind a manual "Load more" |
| Shared Props | `/features/state/shared-props` | **Shared props**: `auth` from middleware, `locale` from the handler's `view.share()`; the page object's `sharedProps` lists both, which is what keeps the sidebar on screen during instant visits |
| URL Fragments | `/features/navigation/fragments` | **Fragment redirects**: "Redirect to #security" POSTs to a handler redirecting to `…#security`; the response is `409` + `X-Inertia-Redirect` and the client lands on the section. "Save billing" posts from `#billing`, the handler calls `preserveFragment().back()`, and the URL keeps the fragment |
| History Management | `/features/navigation/history` | **History encryption**: the route has `@EncryptHistory()`, so `encryptHistory: true` is on the page object and the client encrypts the entry; "Log out" POSTs to a handler calling `clearHistory().back()`, and the next page object carries `clearHistory: true` |
| Deferred Props | `/features/data-loading/deferred-props` | **Deferred + rescue**: the page paints first; two groups follow in two requests; the recommendations closure throws on purpose and `rescue: true` keeps the counters in the same request alive, with the failure under `rescuedProps` and the `<Deferred rescue>` slot shown |
| Prop Merging | `/features/data-loading/prop-merging` | **Merge variants**: the same reload combined four ways — `merge()` appends, `prepend()` puts new items first, `matchOn: 'id'` updates a known item in place, `deepMerge()` merges an object key by key with matched arrays inside. Reset makes the client replace |
| Once Props | `/features/data-loading/once-props` | **Once props**: `organizations` is resolved once (`as: 'organizations'`, `until: 300`) and remembered by the client; later visits send `X-Inertia-Except-Once-Props` and the response leaves the prop out. `?fresh=1` forces a re-resolve. **Flash + refresh**: the "Add an organization" form POSTs, the handler calls `view.flash(...)`, `view.refresh('organizations')` and `back()`; the redirect target shows the message once and re-resolves the once prop. A plain `serverTime` prop changes on every visit for contrast |
| Infinite Scroll | `/features/data-loading/infinite-scroll?page=3` | **Both directions, on scroll**: lands on page 3; scrolling down appends, scrolling back to the top prepends (`X-Inertia-Infinite-Scroll-Merge-Intent: prepend` → `prependProps`) with the scroll position kept |
| HTTP Exceptions | `/features/errors/http` | **Error pages**: each link throws; `errorPages` renders `Errors/Show` with the error's status for 403, 404, 500 and 503 (Inertia visit *and* first load), while 419 and 429 fall through to Nest's JSON and the client's error dialog. Unknown contact ids on `/contacts/:id` get the same page |
| useForm | `/features/forms/use-form` | **useForm**: `data`, `errors`, `processing`, `transform`, `reset`, `clearErrors`, and the status flags; the handler is a Zod schema plus `back()` |
| Form Component | `/features/forms/form-component` | **`<Form>`**: uncontrolled inputs with `name`s, render props for `errors`/`processing`/`wasSuccessful`, `resetOnSuccess`; same handler shape |
| File Uploads | `/features/forms/file-uploads` | **Multipart**: a `File` in the form data; Nest's `FileInterceptor('avatar')` + `@UploadedFile()`, text fields in `@Body()`, a progress bar, validation through the same errors flow |
| Precognition | `/features/forms/precognition` | **Live validation with a database rule**: "email already registered" is an async Zod `refine`, so precognition reports it on blur without running the handler |
| Optimistic Updates | `/features/forms/optimistic-updates` | **Optimistic**: `form.optimistic()` and `router.patch({ optimistic })` show the change at once; the server sleeps 1.2 s; typing `fail` rolls the copy back with an error |
| Dotted Keys | `/features/forms/dotted-keys` | **Standard Schema + Precognition**: a nested form validated by a Zod schema through `@Body({ schema })`; errors arrive as `user.email`, `address.postcode`, `tags.0`. Leaving a field validates it live against the same endpoint (`Precognition: true`, handler never runs). No DTO class, no `emitDecoratorMetadata` |
| Validation | `/features/forms/validation` | **Validation errors**: submit under 3 characters → `ValidationException` → redirect back with `errors.message` inline. Also the demo's only **`@Ssr()`** route; `/features/forms/validation-csr` is the same page without it |

The database is SQLite (`demo.sqlite`), seeded on first boot with 4 users, 15
organizations, 100 contacts and notes on 40 of them, spread over the last 30 days.
Delete the file to reseed.

Manual checks while developing:

1. **Client-side navigation** — click through the sidebar and confirm no full page
   reload; the Network tab should show `X-Inertia` XHRs, not document requests.
2. **Deferred props** — on `/dashboard`, confirm the first response omits the three
   counters and lists them under `deferredProps`, then a second request fills them in.
3. **Validation flow** — submit a short message and confirm the redirect back, the
   populated `errors.message`, and no full reload.
4. **Asset versioning** — change `version` in `src/app.module.ts`, then navigate; the
   server answers `409` and forces a full page visit.
5. **HMR** — edit a page component while a form has input; it should update without
   losing the value. Edit `app.css` and the `<link>` swaps in place.
6. **Infinite scroll** — on `/contacts`, scroll down: the Network tab shows a partial
   `GET /contacts?page=2` with `X-Inertia-Partial-Data: contacts`, and rows are
   appended. Toggle Favorites: one request with `X-Inertia-Reset: contacts`, the
   list is replaced, and page 2 of the filtered list loads as soon as its end
   marker is in view.
7. **SSR** — View Source (not the Elements tab) on `/features/forms/validation` shows
   `data-server-rendered="true"` and the stylesheet link *before* the body, in dev
   too, so there is no flash of unstyled content. `/features/forms/validation-csr`
   shows the page-object script instead.
8. **Precognition** — on Dotted Keys, type an invalid email and tab out: the
   Network tab shows a POST with `Precognition: true` and
   `Precognition-Validate-Only: user.email` answered `422`; fix it and tab out
   again: `204` with `Precognition-Success: true`, and a green check. "Accepted
   submissions" does not grow — the handler never ran.
9. **Error pages** — on HTTP Exceptions, click 404: the Network tab shows a
   response with status 404 *and* a page object, and the page renders with the
   sidebar (shared props). Click 419: no page object, Nest's JSON in Inertia's
   error dialog. Open `/features/errors/http/404` in a new tab: a real 404 with
   the HTML shell.
10. **Flash** — on the Once Props page, add an organization: the POST answers 302
   with a `Set-Cookie: mvc_flash=…` carrying the message and the refresh key, the
   GET after it shows the green message and a new resolve stamp, and the next GET
   shows neither. The cookie is the only memory.

Handy one-liners:

```sh
curl -s localhost:3000/dashboard | grep script            # which asset tags are emitted
curl -s -H 'X-Inertia: true' -H 'X-Inertia-Version: dev' \
     localhost:3000/dashboard                             # raw page object
curl -s -o /dev/null -w '%{http_code}\n' \
     -H 'X-Inertia: true' -H 'X-Inertia-Version: stale' \
     localhost:3000/dashboard                             # expect 409
```

## Production build

```sh
pnpm --filter demo build       # one `vite build`: dist/client + dist/ssr
pnpm --filter demo start:prod  # NODE_ENV=production is set by the script
```

Still one process: the SSR bundle is imported into the Nest process rather than
served by a sidecar. Vite does not run. `main.ts` serves `dist/client` under
`/build/`, and `ctx.assets()` resolves hashed tags from the manifest. Verify with
`curl -s localhost:3000/dashboard | grep 'link\|script'` — you should see
`/build/assets/app-<hash>.css`, `/build/assets/client-<hash>.js` and no `@vite/client`.

## Structure

```
apps/demo
├── src/                        # NestJS server
│   ├── app.module.ts           # MvcModule.forRoot({ version, template, vite: { root }, errorPages })
│   ├── app.controller.ts       # / redirect + the Forms/Validation feature page
│   ├── pagination.ts           # paginate() (offset) and paginateAfter() (keyset) shaped for scroll()
│   ├── features/               # Kitchen Sink controllers, one per feature group (forms, data loading, navigation, state, errors)
│   ├── shared-props.middleware.ts  # shares auth.user on every response, via requestState(req)
│   ├── template.ts             # HTML shell; ctx.assets() handles dev/prod tags
│   ├── main.ts                 # bootstrap; StandardSchemaValidationPipe + static assets in production
│   ├── crm/                    # Dashboard, Contacts, Organizations controllers
│   └── database/               # TypeORM entities, module and seeder
├── vite.config.ts              # react() + tailwindcss() + nestjsMvc(); no entries, no build block
└── frontend/                   # React client — no main.tsx, no ssr.tsx: both are generated
    ├── app.css                 # linked by nestjsMvc() as a stylesheet, in dev too
    ├── navigation.ts           # sidebar config; items without href render muted
    ├── layouts/AppLayout.tsx
    ├── components/Sidebar.tsx
    └── pages/
        ├── Crm/Dashboard.tsx
        ├── Contacts/{Index,Show}.tsx
        ├── Organizations/{Index,Show}.tsx
        ├── Features/Forms/{Validation,UseForm,FormComponent,FileUploads,Precognition,OptimisticUpdates}.tsx
        ├── Features/Forms/DottedKeys.tsx
        ├── Features/Errors/Http.tsx
        ├── Features/Navigation/History.tsx
        ├── Features/Navigation/Fragments.tsx
        ├── Features/State/SharedProps.tsx
        ├── Errors/Show.tsx         # the error page errorPages renders
        ├── Features/DataLoading/DeferredProps.tsx
        ├── Features/DataLoading/InfiniteScroll.tsx
        ├── Features/DataLoading/OnceProps.tsx
        └── Features/DataLoading/PropMerging.tsx
```
