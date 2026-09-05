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
| Contacts | `/contacts` | Search + favourites filter via `router.get(..., { preserveState, replace })` |
| Contact | `/contacts/:id` | **Deferred props**: the profile renders first, `notes` stream in after |
| Organizations | `/organizations` | List with a grouped contact count (one query, no N+1) |
| Organization | `/organizations/:id` | Deferred `contacts` list |
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
6. **SSR** — View Source (not the Elements tab) on `/features/forms/validation` shows
   `data-server-rendered="true"` and the stylesheet link *before* the body, in dev
   too, so there is no flash of unstyled content. `/features/forms/validation-csr`
   shows the page-object script instead.

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
│   ├── app.module.ts           # MvcModule.forRoot({ version, template, vite: { root } })
│   ├── app.controller.ts       # / redirect + the Forms/Validation feature page
│   ├── shared-props.middleware.ts  # shares auth.user on every response
│   ├── template.ts             # HTML shell; ctx.assets() handles dev/prod tags
│   ├── main.ts                 # bootstrap + static assets in production
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
        └── Features/Forms/Validation.tsx
```
