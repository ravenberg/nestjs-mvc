#!/usr/bin/env bash
# Pulls the latest code, builds nestjs-mvc and the docs, and (re)starts the
# docs with pm2. Run it on the server from anywhere:
#
#   ~/nestjs-mvc/apps/docs/deploy.sh
set -euo pipefail

DOCS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DOCS/../.." && pwd)"

if [ ! -f "$DOCS/.env" ]; then
  echo "Missing $DOCS/.env. Copy .env.example to .env and fill in APP_KEY first." >&2
  exit 1
fi

cd "$ROOT"

echo "→ git pull"
git pull --ff-only

echo "→ pnpm install"
pnpm install --frozen-lockfile

echo "→ build nestjs-mvc"
pnpm build

echo "→ build docs"
pnpm --filter docs build

echo "→ restart with pm2"
cd "$DOCS"
# Starts the app when pm2 doesn't know it yet, restarts it otherwise.
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save

echo "✓ Deployed $(git -C "$ROOT" log -1 --format='%h %s')"
