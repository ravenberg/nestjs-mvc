import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Loads apps/docs/.env (APP_KEY, PORT) when it exists, so `pnpm start:prod` and
// pm2 need no flags. Imported first by the entry files, before anything reads
// the environment. Variables that are already set win over the file.
const file = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(file)) process.loadEnvFile(file)
