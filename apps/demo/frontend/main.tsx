import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import './app.css'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })
    const page = pages[`./pages/${name}.tsx`]
    if (!page) {
      throw new Error(
        `Page "${name}" not found. Expected frontend/pages/${name}.tsx — check the string passed to @View().`,
      )
    }
    return page as never
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})
