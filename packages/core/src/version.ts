import type { InertiaVersion } from './types'

export async function resolveVersion(version: InertiaVersion | undefined): Promise<string | null> {
  if (version === undefined) return null
  return typeof version === 'function' ? await version() : version
}
