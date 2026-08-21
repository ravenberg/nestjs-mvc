import { readFileSync } from 'node:fs'
import { inertiaBody, type InertiaPage } from '@nestjs-inertia/core'

const DEV = process.env.NODE_ENV !== 'production'
const VITE = 'http://localhost:5173'

interface ManifestChunk {
  file: string
  css?: string[]
}

function assetTags(): string {
  if (DEV) {
    return `<script type="module">
  import RefreshRuntime from '${VITE}/@react-refresh'
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
</script>
<script type="module" src="${VITE}/@vite/client"></script>
<script type="module" src="${VITE}/frontend/main.tsx"></script>`
  }

  const manifest: Record<string, ManifestChunk> = JSON.parse(
    readFileSync(new URL('../dist/client/.vite/manifest.json', import.meta.url), 'utf-8'),
  )
  const entry = manifest['frontend/main.tsx']
  return [
    `<script type="module" src="/build/${entry.file}"></script>`,
    ...(entry.css ?? []).map((file) => `<link rel="stylesheet" href="/build/${file}">`),
  ].join('\n')
}

export function template(page: InertiaPage): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NestJS × Inertia demo</title>
${assetTags()}
</head>
<body>${inertiaBody(page)}</body>
</html>`
}
