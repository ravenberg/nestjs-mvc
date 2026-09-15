import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

// No entries, no build block: nestjsMvc() generates the client and SSR entries
// (the page a route renders is the entry point), links the stylesheet, and
// makes `vite build` produce dist/client and dist/ssr in one go. The pages are
// the shared kitchen sink's, which is the only reason `pages` and `css` are set.
export default defineConfig({
  plugins: [react(), tailwindcss(), nestjsMvc({ pages: '../shared/react/pages', css: ['../shared/app.css'] })],
})
