import { fileURLToPath } from 'node:url'
import { bootstrap } from 'kitchen-sink/platform/fastify'
import { AppModule } from './app.module'

bootstrap(AppModule, { root: fileURLToPath(new URL('..', import.meta.url)), port: 3006, name: 'Vue on Fastify' })
