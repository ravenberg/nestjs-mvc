import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    outDir: 'dist/client',
    rollupOptions: {
      input: 'frontend/main.tsx',
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
})
