import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node20',
  // ESM-only: let the extension follow "type": "module" (.js) instead of forcing .mjs.
  fixedExtension: false,
  deps: {
    neverBundle: ['@nestjs/common', '@nestjs/core', 'rxjs', 'express', 'vite'],
  },
})
