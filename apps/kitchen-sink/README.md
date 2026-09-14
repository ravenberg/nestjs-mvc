# Kitchen sink

A NestJS + React + Tailwind app that exercises every feature of `nestjs-mvc`
while the adapter in [`packages/core`](../../packages/core) is developed: a
mini-CRM plus one page per protocol feature, and the Playwright regression suite
that runs against it. It is a test bed, not the documentation.

## Permutations

`shared/` holds what every app has in common and does not run on its own. One
app per frontend framework and HTTP platform does, and all of them run the same
e2e suite:

| App | Port | From the repo root |
|---|---|---|
| [`kitchen-sink-react-express`](react-express) | 3000 | `pnpm dev` |
| [`kitchen-sink-react-fastify`](react-fastify) | 3002 | `pnpm dev:fastify` |

- `shared/server/`: every controller, auth, the database and the `MvcModule`
  configuration, as `KitchenSinkModule.forRoot({ root, platform })`.
- `shared/react/`: pages, layouts and `app.css`. Another framework gets a sibling
  directory with the same page names and reuses `shared/server/` and `shared/e2e/`.
- `shared/e2e/`: the Playwright specs, plus `config.ts` that each app's
  `playwright.config.ts` calls with its port and platform.
- **In each app:** `main.ts` (adapter, plugins, static files), `vite.config.ts`,
  and the one handler that cannot be shared, the file upload POST.

Server code that turns out to differ per platform goes into the apps, never
behind an `if (platform)` in `shared/server/`, so every difference stays visible.

## Stack

- **Server**: NestJS (`shared/server/`), on Express (`:3000`) or Fastify (`:3002`) depending on the app
- **Client**: React 19 + Vite + Tailwind v4 (`shared/react/`), served by Nest itself — no second port
- **Data**: TypeORM + SQLite, seeded on first boot
- **Adapter**: `nestjs-mvc` (workspace package, linked via pnpm)

## Getting started

From the repo root:

```sh
pnpm install
pnpm build   # builds packages/core → dist/index.js, required before first run
pnpm dev           # React on Express
pnpm dev:fastify   # React on Fastify, http://localhost:3002
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
`vite` option on `MvcModule.forRoot()` (see [`shared/server/kitchen-sink.module.ts`](shared/server/kitchen-sink.module.ts))
boots Vite in *middleware mode* inside the Nest process:

| | Dev | Production |
|---|---|---|
| Processes | 1 | 1 |
| Ports | 1 (`:3000`, HMR websocket included) | 1 (`:3000`) |
| Client assets | Vite dev server, in-process, with HMR | Prebuilt `dist/client`, served by Nest under `/build/` |
| Tags | `<link>` to `/@fs/…/apps/kitchen-sink/shared/react/app.css` (outside the app's Vite root) + `/@id/virtual:nestjs-mvc/client` + injected HMR client | `/build/assets/app-<hash>.css` + `/build/assets/client-<hash>.js` from the Vite manifest |

There is no `main.tsx` and no `ssr.tsx`: `nestjsMvc()` in
each app's `vite.config.ts` generates both entries from `shared/react/pages/`
and links `shared/react/app.css` as a real stylesheet in both modes.

`ctx.assets()` in [`shared/server/template.ts`](shared/server/template.ts) emits the right tags for
whichever mode is active, so the template has no `NODE_ENV` branching. Vite is a
build-time dependency only — it is never loaded in production.

Reload behaviour while developing:

- Editing **`shared/react/`** → Vite HMR, no server restart, React state preserved.
- Editing **`shared/server/`**, an app's **`src/`** or **`packages/core/src`** → `tsx watch` restarts Nest
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
| Persistent Layouts | `/features/layouts/persistent/first` | **`Page.layout`**: the frame (a clock, a visit counter) stays mounted while the page inside it changes; every other demo page renders its layout inside the page and remounts it |
| Nested Layouts | `/features/layouts/nested/overview` | **Two layouts, one inside the other**: the persistent frame plus a tab strip, both kept across tab switches; declared once in `Page.layout` |
| Head | `/features/layouts/head/monolith` | **`<Head>`**: per-page `<title>`, `<meta>` and canonical link, swapped on each visit; the tab title changes as you switch articles |
| Layout Props | `/features/layouts/props/light` | **`setLayoutProps()`**: the page hands `title`, `theme` and `accent` to the persistent layout it does not own; reset on the next page that sets none |
| Global Events | `/features/events/global` | **`router.on(...)`**: a log of every event (`before` … `finish`, `navigate`, `prefetching`, `flash`) with the visit's method and URL; a checkbox cancels visits from `before` |
| Visit Callbacks | `/features/events/callbacks` | **Per-visit hooks**: `onBefore`, `onStart`, `onSuccess`, `onCancelToken` + `cancel()`, `onFinish`; with `errorPages` configured a 404/500 arrives as a page, so it is `onSuccess`, not `onHttpException` |
| Progress | `/features/events/progress` | **Progress bar**: a 2 s visit shows it, a 100 ms visit does not (250 ms delay), `showProgress: false`, and manual `progress.start()/set()/finish()` |
| Network Errors | `/features/errors/network` | **`onNetworkError`**: a visit to an unreachable port, a route that never answers cancelled with the cancel token, and a 503 for contrast; return `false` to keep the dialog away |
| useHttp | `/features/http/use-http` | **`useHttp()`**: a typeahead against a plain JSON handler (no `@View()`), and a POST validated by the same global pipe as every form; `validation: { jsonStatus: 422 }` answers the non-Inertia failure with `422` + `{ errors }` so `errors` fills in like a form |
| Links & Methods | `/features/navigation/links` | **`<Link>`**: GET tabs, and `method="post|put|patch|delete"` with `data` and `as="button"`; the server lists what it received; 303 after non-GET |
| Preserve State | `/features/navigation/preserve-state` | **preserveState**: the same component instance (draft and mount time survive) versus a remount |
| Preserve Scroll | `/features/navigation/preserve-scroll` | **preserveScroll**: a 40-row list; a visit keeps the scroll position, a plain visit resets it |
| Redirects | `/features/navigation/redirects` | **Every redirect kind**: `redirect()` 302, `back()`, 303 after PUT, `location()` 409 + `X-Inertia-Location`, and a pointer to fragment redirects |
| Partial Reloads | `/features/data-loading/partial-reloads` | **Partial reloads**: props stamped with their resolve time; `only`/`except` show which closures ran (the 700 ms `stats` is skipped unless asked); `optional()` `audit` loads on request |
| When Visible | `/features/data-loading/when-visible` | **`<WhenVisible>`**: three `optional()` sections, each fetched by a partial reload when it scrolls into view; one with `always` |
| Polling | `/features/data-loading/polling` | **`usePoll`**: a partial reload of one prop every 2 s, start/stop, pauses in a background tab; values derive from the clock, no server state |
| Link Prefetch | `/features/prefetching/links` | **Prefetch**: hover (default), mount, click, and none, against 400 ms pages that stamp their render time; the target page shows its age and `usePrefetch()` |
| Stale While Revalidate | `/features/prefetching/swr` | **SWR**: `cacheFor={['3s', '1m']}` on a quote that changes every second; the stale copy shows at once and swaps when the refresh lands |
| Cache Management | `/features/prefetching/cache` | **Cache tags**: pages prefetched with `cacheTags`, a reprice POST with `invalidateCacheTags`, and `flush` / `flushByCacheTags` / `flushAll` buttons |
| Remember | `/features/state/remember` | **useRemember**: form state kept in the history entry so Back restores it; a `useState` twin for contrast |
| Flash Data | `/features/state/flash` | **Flash**: one key, structured keys, flash on a GET's own render, `router.flash()` client-side, and a `router.on('flash')` log |
| Shared Props | `/features/state/shared-props` | **Shared props**: `auth` from middleware, `locale` from the handler's `view.share()`; the page object's `sharedProps` lists both, which is what keeps the sidebar on screen during instant visits |
| URL Fragments | `/features/navigation/fragments` | **Fragment redirects**: "Redirect to #security" POSTs to a handler redirecting to `…#security`; the response is `409` + `X-Inertia-Redirect` and the client lands on the section. "Save billing" posts from `#billing`, the handler calls `preserveFragment().back()`, and the URL keeps the fragment |
| History Management | `/features/navigation/history` | **History encryption**: the route has `@EncryptHistory()`, so `encryptHistory: true` is on the page object and the client encrypts the entry; "Log out" POSTs to a handler calling `clearHistory().back()`, and the next page object carries `clearHistory: true` |
| Deferred Props | `/features/data-loading/deferred-props` | **Deferred + rescue**: the page paints first; two groups follow in two requests; the recommendations closure throws on purpose and `rescue: true` keeps the counters in the same request alive, with the failure under `rescuedProps` and the `<Deferred rescue>` slot shown |
| Prop Merging | `/features/data-loading/prop-merging` | **Merge variants**: the same reload combined four ways — `merge()` appends, `prepend()` puts new items first, `matchOn: 'id'` updates a known item in place, `deepMerge()` merges an object key by key with matched arrays inside. Reset makes the client replace |
| Once Props | `/features/data-loading/once-props` | **Once props**: `organizations` is resolved once (`as: 'organizations'`, `until: 300`) and remembered by the client; later visits send `X-Inertia-Except-Once-Props` and the response leaves the prop out. `?fresh=1` forces a re-resolve. **Flash + refresh**: the "Add an organization" form POSTs, the handler calls `view.flash(...)`, `view.refresh('organizations')` and `back()`; the redirect target shows the message once and re-resolves the once prop. A plain `serverTime` prop changes on every visit for contrast |
| Infinite Scroll | `/features/data-loading/infinite-scroll?page=3` | **Both directions, on scroll**: lands on page 3; scrolling down appends, scrolling back to the top prepends (`X-Inertia-Infinite-Scroll-Merge-Intent: prepend` → `prependProps`) with the scroll position kept |
| HTTP Exceptions | `/features/errors/http` | **Error pages**: each link throws; `errorPages` renders `Errors/Show` with the error's status for 403, 404, 500 and 503 (Inertia visit *and* first load), while 419 and 429 fall through to Nest's JSON and the client's error dialog. Unknown contact ids on `/contacts/:id` get the same page |
| useForm | `/features/forms/use-form` | **useForm**: `data`, `errors`, `processing`, `transform`, `reset`, `clearErrors`, and the status flags; the handler is a Zod schema plus `back()`. A second form posts with `errorBag: 'password'` to a handler that flattens with `messages: 'all'`, so one field arrives with four messages |
| Form Component | `/features/forms/form-component` | **`<Form>`**: uncontrolled inputs with `name`s, render props for `errors`/`processing`/`wasSuccessful`, `resetOnSuccess`; same handler shape |
| File Uploads | `/features/forms/file-uploads` | **Multipart**: a `File` in the form data; on Express Nest's `FileInterceptor('avatar')` + `@UploadedFile()`, on Fastify `@fastify/multipart`'s `req.parts()`; a progress bar, validation through the same errors flow, and a 413 over 2 MB on both |
| Precognition | `/features/forms/precognition` | **Live validation with a database rule**: "email already registered" is an async Zod `refine`, so precognition reports it on blur without running the handler |
| Optimistic Updates | `/features/forms/optimistic-updates` | **Optimistic**: `form.optimistic()` and `router.patch({ optimistic })` show the change at once; the server sleeps 1.2 s; typing `fail` rolls the copy back with an error |
| Dotted Keys | `/features/forms/dotted-keys` | **Standard Schema + Precognition**: a nested form validated by a Zod schema through `@Body({ schema })`; errors arrive as `user.email`, `address.postcode`, `tags.0`. Leaving a field validates it live against the same endpoint (`Precognition: true`, handler never runs). No DTO class, no `emitDecoratorMetadata` |
| Validation | `/features/forms/validation` | **Validation errors**: submit under 3 characters → `ValidationException` → redirect back with `errors.message` inline. Also the demo's only **`@Ssr()`** route; `/features/forms/validation-csr` is the same page without it |

The database is SQLite (`kitchen-sink.sqlite`, one per app), seeded on first boot with 4 users, 15
organizations, 100 contacts and notes on 40 of them, spread over the last 30 days.
Delete the file to reseed.

## Regression tests (Playwright)

```sh
pnpm test:e2e            # from the repo root: both apps in turn; or `npx playwright test` in one app
npx playwright test --ui # step through a test
```

`shared/e2e/` runs against an app's dev server on its port, reusing one that is already
running (otherwise it starts `pnpm dev` itself). Two layers:

- `smoke.spec.ts` checks it is talking to the platform the app is for, derives every page from `shared/react/navigation.ts`, loads each
  one on a first load with no console errors, then clicks through all of them
  from the sidebar and checks each was an Inertia visit, not a reload.
- One spec per sidebar group (`forms`, `navigation`, `data-loading`,
  `prefetching-state`, `layouts-events-errors`) exercises the behaviour a page
  demonstrates: errors come back, flash shows once, the once prop keeps its
  stamp, the persistent layout stays mounted, the 404 answers 404 with a page,
  the SSR route ships markup, and so on.

State is in memory per server, so tests use unique values and never assume an
empty list. Restart the server after editing `shared/react/` from a script: Vite
does not always notice those writes.

Manual checks while developing:

1. **Client-side navigation** — click through the sidebar and confirm no full page
   reload; the Network tab should show `X-Inertia` XHRs, not document requests.
2. **Deferred props** — on `/dashboard`, confirm the first response omits the three
   counters and lists them under `deferredProps`, then a second request fills them in.
3. **Validation flow** — submit a short message and confirm the redirect back, the
   populated `errors.message`, and no full reload.
4. **Asset versioning** — change `version` in `shared/server/kitchen-sink.module.ts`, then navigate; the
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
11. **Persistent layouts** — on Persistent Layouts, click first/second/third: the
   clock keeps counting and "pages shown" goes up by one per visit; the layout
   never remounts. "props: dark" restyles the same frame through layout props.

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
pnpm --filter kitchen-sink-react-express build       # one `vite build`: dist/client + dist/ssr
pnpm --filter kitchen-sink-react-express start:prod  # needs APP_KEY and JWT_SECRET; same for -fastify
```

Still one process: the SSR bundle is imported into the Nest process rather than
served by a sidecar. Vite does not run. Each app's `main.ts` serves `dist/client` under
`/build/` (`useStaticAssets()` on Express; `@fastify/static` registered and
awaited on Fastify, where `useStaticAssets()` hangs `listen()` on NestJS 12), and `ctx.assets()` resolves hashed tags from the manifest. Verify with
`curl -s localhost:3000/dashboard | grep 'link\|script'` — you should see
`/build/assets/app-<hash>.css`, `/build/assets/client-<hash>.js` and no `@vite/client`.

## Structure

```
apps/kitchen-sink
├── README.md                           # this file
├── shared/                             # package `kitchen-sink`; does not run on its own
│   ├── server/                         # NestJS, the same on every platform
│   │   ├── index.ts                    # what the apps import: KitchenSinkModule, UploadGallery, Public
│   │   ├── kitchen-sink.module.ts      # forRoot({ root, platform }): MvcModule config, controllers, middleware
│   │   ├── app.controller.ts           # / redirect + the Forms/Validation feature page
│   │   ├── pagination.ts               # paginate() (offset) and paginateAfter() (keyset) shaped for scroll()
│   │   ├── features/                   # one controller per feature group; upload-gallery.ts keeps uploads
│   │   ├── shared-props.middleware.ts  # shares auth.notifications on every response, via requestState(req)
│   │   ├── template.ts                 # HTML shell; ctx.assets() handles dev/prod tags
│   │   ├── auth/                       # the guard, login, password reset, email verification
│   │   ├── crm/                        # Dashboard, Contacts, Organizations controllers
│   │   └── database/                   # TypeORM entities, module (one SQLite file per app) and seeder
│   ├── react/                          # no main.tsx, no ssr.tsx: both are generated
│   │   ├── app.css                     # Tailwind, scanning this directory: source('.')
│   │   ├── navigation.ts               # sidebar config; the smoke spec derives every page from it
│   │   ├── layouts/ components/
│   │   └── pages/                      # Crm, Contacts, Organizations, Features/*, Errors/Show
│   └── e2e/                            # the Playwright specs, and config.ts every app calls
├── react-express/                      # package `kitchen-sink-react-express`, :3000
│   ├── src/main.ts                     # the adapter, static files in production
│   ├── src/app.module.ts               # KitchenSinkModule.forRoot({ root, platform }) + UploadController
│   ├── src/upload.controller.ts        # the file upload POST, the one handler per platform
│   ├── vite.config.ts                  # nestjsMvc({ pages, css }) pointing at ../shared/react
│   └── playwright.config.ts            # kitchenSinkConfig({ dir, port, platform })
└── react-fastify/                      # package `kitchen-sink-react-fastify`, :3002; same shape, plus multipart in main.ts
```
