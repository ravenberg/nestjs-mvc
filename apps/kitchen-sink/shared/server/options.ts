/** How a permutation app (`kitchen-sink-<framework>-<platform>`) configures the shared kitchen sink. */
export interface KitchenSinkOptions {
  /** The app's own directory: holds its `vite.config.ts`, `dist/` and the SQLite file. */
  root: string
  /** The HTTP platform the app runs on; shown where the server code differs per platform. */
  platform: 'express' | 'fastify'
}

export const KITCHEN_SINK_OPTIONS = 'KITCHEN_SINK_OPTIONS'
