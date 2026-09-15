import { fileURLToPath } from 'node:url'
import { kitchenSinkConfig } from 'kitchen-sink/e2e/config'

// The shared specs in apps/kitchen-sink/shared/e2e, against this app.
export default kitchenSinkConfig({ dir: fileURLToPath(new URL('.', import.meta.url)), port: 3006, platform: 'fastify', framework: 'vue' })
