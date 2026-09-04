import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server runs in middleware mode inside the Nest process (see app.module.ts),
// so there is no `server` block here and no second port.
export default defineConfig(({ command }) => ({
  // Built assets are served by Nest under /build/; in dev Vite owns the root.
  base: command === 'build' ? '/build/' : '/',
  plugins: [react()],
  build: {
    manifest: true,
    outDir: 'dist/client',
    rollupOptions: {
      input: 'frontend/main.tsx',
    },
  },
}))
