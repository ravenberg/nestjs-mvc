/**
 * Per-framework templates for the generated entries. Each receives the page
 * resolver (a `pages` glob plus `resolvePage(name)`) and returns plain JavaScript —
 * no JSX, no TypeScript — so the code needs no framework plugin to be transformed.
 */
export interface Preset {
  /** Page component extensions, in lookup order. */
  extensions: string[]
  client(resolver: string): string
  ssr(resolver: string): string
}

export type Framework = 'react'

const react: Preset = {
  extensions: ['tsx', 'jsx'],

  client: (resolver) => `
import { createInertiaApp } from '@inertiajs/react'
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
import { createInertiaApp } from '@inertiajs/react'
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

export const presets: Record<Framework, Preset> = { react }
