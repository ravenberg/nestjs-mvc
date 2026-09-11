import { usePage } from 'nestjs-mvc/react'
import type { NavSection } from '../../src/navigation'

/** The sidebar structure, shared by the server with every page. */
export function useNavigation(): NavSection[] {
  return (usePage().props.navigation as NavSection[] | undefined) ?? []
}

/** The current path without query or hash, for "is this link active". */
export function usePathname(): string {
  const { url } = usePage()
  return url.split(/[?#]/)[0]
}
