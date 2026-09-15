// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { createBuilder, createServer, type InlineConfig } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CLIENT_ENTRY, SSR_ENTRY, nestjsMvc } from '../src/vite-plugin'
import type { PageObject } from '../src/index'

/**
 * The Vue preset for real: a one-page Vue app built with `vite build` and
 * rendered from the SSR bundle, and the same page rendered through Vite in
 * development. The app lives under test/ so `vue` and `@inertiajs/vue3`
 * resolve from this package's node_modules, the way they would in an app.
 */
const root = mkdtempSync(join(fileURLToPath(new URL('.', import.meta.url)), '.vue-app-'))

const page: PageObject = {
  component: 'Users/Show',
  props: { errors: {}, name: 'Ada' },
  url: '/users/1',
  version: 'test',
  encryptHistory: false,
  clearHistory: false,
} as PageObject

function config(): InlineConfig {
  return {
    root,
    configFile: false,
    logLevel: 'silent',
    // What an app gets from the published package; here, the source.
    resolve: { alias: { 'nestjs-mvc/vue': fileURLToPath(new URL('../src/vue.ts', import.meta.url)) } },
    plugins: [vue(), nestjsMvc()],
  }
}

beforeAll(() => {
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: { vue: '^3.5.0', '@inertiajs/vue3': '^3.7.0' } }))
  mkdirSync(join(root, 'frontend/pages/Users'), { recursive: true })
  writeFileSync(
    join(root, 'frontend/pages/Users/Show.vue'),
    `<script setup lang="ts">
import { Head } from 'nestjs-mvc/vue'

defineProps<{ name: string }>()
</script>

<template>
  <Head title="Hello from Vue" />
  <h1>Hello, {{ name }}</h1>
  <!-- $page only exists when the Inertia plugin is installed on the app. -->
  <p>{{ $page.url }}</p>
</template>
`,
  )
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('Vue preset', () => {
  it('builds both bundles in one vite build, and the SSR bundle renders the page and its head', async () => {
    const builder = await createBuilder(config())
    await builder.buildApp()

    const { default: render } = (await import(pathToFileURL(join(root, 'dist/ssr/ssr.js')).href)) as {
      default: (page: PageObject) => Promise<{ head: string[]; body: string }>
    }
    const result = await render(page)

    expect(result.body).toContain('<h1>Hello, Ada</h1>')
    expect(result.body).toContain('<p>/users/1</p>')
    expect(result.body).toContain('data-server-rendered')
    expect(result.head.join('')).toContain('Hello from Vue')
  }, 60_000)

  it('renders the same page through the dev server, the way SsrService does in development', async () => {
    const server = await createServer({ ...config(), appType: 'custom', server: { middlewareMode: true, hmr: false } })
    try {
      const module = (await server.ssrLoadModule(SSR_ENTRY)) as {
        default: (page: PageObject) => Promise<{ head: string[]; body: string }>
      }
      const result = await module.default(page)

      expect(result.body).toContain('<h1>Hello, Ada</h1>')
      expect(result.body).toContain('<p>/users/1</p>')
      expect(result.head.join('')).toContain('Hello from Vue')
    } finally {
      await server.close()
    }
  }, 60_000)

  it('finds a page added while the dev server runs, without a restart', async () => {
    const server = await createServer({ ...config(), appType: 'custom', server: { middlewareMode: true, hmr: false } })
    const render = async (component: string) => {
      const module = (await server.ssrLoadModule(SSR_ENTRY)) as { default: (page: PageObject) => Promise<{ body: string }> }
      return (await module.default({ ...page, component })).body
    }
    try {
      await expect(render('Users/Added')).rejects.toThrow(/Page "Users\/Added" not found/)
      // Load the client entry once too, so both generated entries have a stale glob to refresh.
      expect((await server.transformRequest(CLIENT_ENTRY))?.code).not.toContain('Added.vue')

      writeFileSync(join(root, 'frontend/pages/Users/Added.vue'), '<template><p>Added later</p></template>\n')
      let body = ''
      // The watcher reports the new file asynchronously; allow for a busy machine.
      for (let attempt = 0; attempt < 100 && !body; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        body = await render('Users/Added').catch(() => '')
      }

      expect(body).toContain('<p>Added later</p>')
      expect((await server.transformRequest(CLIENT_ENTRY))?.code).toContain('Added.vue')
    } finally {
      rmSync(join(root, 'frontend/pages/Users/Added.vue'), { force: true })
      await server.close()
    }
  }, 60_000)
})
