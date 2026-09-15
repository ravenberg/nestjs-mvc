import { fileURLToPath } from 'node:url'
import { bootstrap } from 'kitchen-sink/platform/express'
import { AppModule } from './app.module'

bootstrap(AppModule, { root: fileURLToPath(new URL('..', import.meta.url)), port: 3004, name: 'Vue on Express' })
