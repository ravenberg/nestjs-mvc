import type { AssetVersion } from './types'

export async function resolveVersion(version: AssetVersion | undefined): Promise<string | null> {
  if (version === undefined) return null
  return typeof version === 'function' ? await version() : version
}
