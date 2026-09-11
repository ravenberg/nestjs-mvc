/**
 * The sidebar. One entry per page under content/; the href is the route and
 * the file path is derived from it (see DocsService). Placeholder until the
 * real structure is written.
 */
export interface NavLink {
  title: string
  href: string
}

export interface NavSection {
  title: string
  links: NavLink[]
}

export const navigation: NavSection[] = [
  {
    title: 'Introduction',
    links: [
      { title: 'Getting started', href: '/' },
      { title: 'Installation', href: '/docs/installation' },
    ],
  },
]
