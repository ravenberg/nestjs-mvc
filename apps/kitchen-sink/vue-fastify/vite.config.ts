import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

// No entries, no build block: nestjsMvc() generates the client and SSR entries
// (the page a route renders is the entry point), links the stylesheet, and
// makes `vite build` produce dist/client and dist/ssr in one go. The pages are
// the shared kitchen sink's, which is the only reason `pages` and `css` are set.
export default defineConfig({
  plugins: [vue(), tailwindcss(), nestjsMvc({ pages: '../shared/vue/pages', css: ['../shared/app.css'] })],
})
