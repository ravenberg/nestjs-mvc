/**
 * Per-framework templates for the generated entries. Each receives the page
 * resolver (a `pages` glob plus `resolvePage(name)`) and returns plain JavaScript —
 * no JSX, no TypeScript — so the code needs no framework plugin to be transformed.
 *
 * The entries import the client from `nestjs-mvc/<framework>`, the same path the
 * app's pages use, so there is exactly one client instance in the bundle.
 */
export interface Preset {
  /** Page component extensions, in lookup order. */
  extensions: string[]
  client(resolver: string): string
  ssr(resolver: string): string
}

export type Framework = 'react' | 'vue'

const react: Preset = {
  extensions: ['tsx', 'jsx'],

  client: (resolver) => `
import { createInertiaApp } from 'nestjs-mvc/react'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
${resolver}
createInertiaApp({
  resolve: resolvePage,
  setup({ el, App, props }) {
    createRoot(el).render(createElement(App, props))
  },
})
`,

  ssr: (resolver) => `
import { createInertiaApp } from 'nestjs-mvc/react'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
${resolver}
export default function render(page) {
  return createInertiaApp({
    page,
    render: renderToString,
    resolve: resolvePage,
    setup: ({ App, props }) => createElement(App, props),
  })
}
`,
}

const vue: Preset = {
  extensions: ['vue'],

  // A server-rendered page is hydrated; any other page is mounted fresh, since
  // hydrating an empty root makes Vue report a mismatch.
  client: (resolver) => `
import { createInertiaApp } from 'nestjs-mvc/vue'
import { createApp, createSSRApp, h } from 'vue'
${resolver}
createInertiaApp({
  resolve: resolvePage,
  setup({ el, App, props, plugin }) {
    const create = el.hasAttribute('data-server-rendered') ? createSSRApp : createApp
    create({ render: () => h(App, props) }).use(plugin).mount(el)
  },
})
`,

  ssr: (resolver) => `
import { createInertiaApp } from 'nestjs-mvc/vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
${resolver}
export default function render(page) {
  return createInertiaApp({
    page,
    render: renderToString,
    resolve: resolvePage,
    setup: ({ App, props, plugin }) => createSSRApp({ render: () => h(App, props) }).use(plugin),
  })
}
`,
}

export const presets: Record<Framework, Preset> = { react, vue }
