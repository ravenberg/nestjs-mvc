# Demo app

A minimal NestJS + React + Vite app used to manually exercise `inertia-nest`
while developing the adapter in [`packages/core`](../../packages/core).

## Stack

- **Server**: NestJS (`src/`) on `http://localhost:3000`
- **Client**: React + Vite (`frontend/`), served by Nest itself — no second port
- **Adapter**: `inertia-nest` (workspace package, linked via pnpm)

## Getting started

From the repo root:

```sh
pnpm install
pnpm build   # builds packages/core → dist/*.mjs, required before first run
pnpm dev
```

Open **http://localhost:3000**.

> ⚠️ The demo imports the workspace package `inertia-nest` from its built
> output (`packages/core/dist`), not from source. If you skip `pnpm build`
> (or run `pnpm dev` on a fresh clone), the server crashes with
> `ERR_MODULE_NOT_FOUND: .../inertia-nest/dist/index.mjs`. Re-run `pnpm build`
> whenever `dist/` is missing or stale.

## Runtime model

**One process, one port — in dev and in production.**

`pnpm dev` runs a single command: `tsx watch src/main.ts`. There is no
`concurrently`, no separate `vite` command and no `localhost:5173`. The
`vite` option on `InertiaModule.forRoot()` (see [`src/app.module.ts`](src/app.module.ts))
boots Vite in *middleware mode* inside the Nest process:

| | Dev | Production |
|---|---|---|
| Processes | 1 | 1 |
| Ports | 1 (`:3000`, HMR websocket included) | 1 (`:3000`) |
| Client assets | Vite dev server, in-process, with HMR | Prebuilt `dist/client`, served by Nest under `/build/` |
| Script tags | `/frontend/main.tsx` + injected HMR client | `/build/assets/main-<hash>.js` from the Vite manifest |

`ctx.assets()` in [`src/template.ts`](src/template.ts) emits the right tags for
whichever mode is active, so the template has no `NODE_ENV` branching. Vite is a
build-time dependency only — it is never loaded in production.

Reload behaviour while developing:

- Editing **`frontend/`** → Vite HMR, no server restart, React state preserved.
- Editing **`src/`** or **`packages/core/src`** → `tsx watch` restarts Nest
  (which tears down and recreates the in-process Vite server, ~0.5s).

## What to test

| Page | URL | What it demonstrates |
|---|---|---|
| Home | `/` | Standard Inertia render + `useForm()` submission |
| Home | `/` | **Validation errors**: submit a message under 3 characters → `InertiaValidationException` → redirect back with `errors.message` rendered inline |
| Home | `/` | **Redirect after POST**: a valid submit redirects back to `/` and the message appears in the list |
| Users | `/users` | **Deferred props** (`defer()`): renders instantly with a "Loading users…" fallback, then fetches `users` ~800ms later via a partial request |

Manual checks while developing:

1. **Client-side navigation** — navigate between Home and Users and confirm no
   full page reload; the Network tab should show an `X-Inertia` XHR, not a
   document request.
2. **Validation flow** — submit a short message on `/` and confirm a 303
   redirect back, a populated `errors.message`, and no full reload.
3. **Deferred props** — on `/users`, confirm the initial page payload omits
   `users` and a second request fetches it. Two requests in the Network tab.
4. **Asset versioning** — change `version` in `src/app.module.ts`, then navigate;
   the server should answer with 409 and force a full page visit.
5. **HMR** — edit `frontend/pages/Home.tsx` while a message is typed in the form;
   the component should update without losing the input value.
6. **In-memory state** — the `messages` array lives in server memory
   (`src/app.controller.ts`), so it resets on server restart but survives
   frontend-only edits.

Handy one-liners:

```sh
curl -s localhost:3000/ | grep script                      # which asset tags are emitted
curl -s -H 'X-Inertia: true' -H 'X-Inertia-Version: dev' \
     localhost:3000/users                                  # raw page object
curl -s -o /dev/null -w '%{http_code}\n' \
     -H 'X-Inertia: true' -H 'X-Inertia-Version: stale' \
     localhost:3000/users                                  # expect 409
```

## Production build

```sh
pnpm --filter demo build       # vite build → dist/client (+ .vite/manifest.json)
pnpm --filter demo start:prod  # NODE_ENV=production is set by the script
```

Vite does not run. `main.ts` serves `dist/client` under `/build/`, and
`ctx.assets()` resolves hashed tags from the manifest. Verify with
`curl -s localhost:3000/ | grep script` — you should see
`/build/assets/main-<hash>.js` and no `@vite/client`.

## Structure

```
apps/demo
├── src/                  # NestJS server
│   ├── app.module.ts     # InertiaModule.forRoot({ version, template, vite })
│   ├── app.controller.ts # routes: GET /, GET /users, POST /messages
│   ├── template.ts       # HTML shell; ctx.assets() handles dev/prod tags
│   └── main.ts           # bootstrap + static assets in production
├── vite.config.ts        # no `server` block — dev runs in middleware mode
└── frontend/             # React client
    ├── main.tsx          # Inertia app + page resolver
    ├── Layout.tsx
    └── pages/
        ├── Home.tsx      # form + validation errors demo
        └── Users.tsx     # defer() + <Deferred> demo
```
