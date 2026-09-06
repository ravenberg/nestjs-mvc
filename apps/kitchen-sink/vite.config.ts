import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

// No entries, no build block: nestjsMvc() generates the client and SSR entries
// (the page a route renders is the entry point), links frontend/app.css, and
// makes `vite build` produce dist/client and dist/ssr in one go. The dev server
// runs in middleware mode inside the Nest process (see app.module.ts).
export default defineConfig({
  plugins: [react(), tailwindcss(), nestjsMvc()],
})
