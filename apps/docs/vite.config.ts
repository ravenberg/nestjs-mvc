import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

// No entries and no build block: nestjsMvc() generates the client and SSR
// entries from frontend/pages and links frontend/app.css.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), nestjsMvc()],
  ssr: {
    // CommonJS packages whose named exports Node cannot see when they stay
    // external: bundle them into dist/ssr. Only for the build — in dev, Vite's
    // module runner would transform them as ESM and trip over `module`.
    noExternal: command === 'build' ? ['@algolia/autocomplete-core', 'react-highlight-words'] : [],
  },
}))
