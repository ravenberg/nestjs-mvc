import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), nestjsMvc()],
})
