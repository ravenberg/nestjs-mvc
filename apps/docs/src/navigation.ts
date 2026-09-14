/**
 * The sidebar. One entry per page under content/; the href is the route and
 * the file path is derived from it (see DocsService). Three sections, from
 * the first page you build to the things a production app needs.
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
    title: 'Getting started',
    links: [
      { title: 'Introduction', href: '/' },
      { title: 'Installation', href: '/docs/installation' },
      { title: 'Your first page', href: '/docs/your-first-page' },
      { title: 'Links', href: '/docs/links' },
      { title: 'Forms and validation', href: '/docs/forms' },
      { title: 'Flash messages', href: '/docs/flash-messages' },
      { title: 'Layouts and titles', href: '/docs/layouts' },
    ],
  },
  {
    title: 'Building your app',
    links: [
      { title: 'Redirects', href: '/docs/redirects' },
      { title: 'Data on every page', href: '/docs/shared-data' },
      { title: 'Loading data later', href: '/docs/loading-data' },
      { title: 'Data the browser keeps', href: '/docs/once' },
      { title: 'File uploads', href: '/docs/file-uploads' },
      { title: 'Live validation', href: '/docs/live-validation' },
      { title: 'Error pages', href: '/docs/error-pages' },
      { title: 'Authentication', href: '/docs/authentication' },
      { title: 'CSRF protection', href: '/docs/csrf' },
    ],
  },
  {
    title: 'Going further',
    links: [
      { title: 'Infinite scroll', href: '/docs/infinite-scroll' },
      { title: 'Growing lists', href: '/docs/merging-props' },
      { title: 'Prefetching', href: '/docs/prefetching' },
      { title: 'Server rendering', href: '/docs/server-rendering' },
      { title: 'Private history', href: '/docs/history-encryption' },
      { title: 'Signed links', href: '/docs/signed-urls' },
      { title: 'Content Security Policy', href: '/docs/content-security-policy' },
      { title: 'Going to production', href: '/docs/production' },
      { title: 'Using Fastify', href: '/docs/fastify' },
      { title: 'How it works', href: '/docs/how-it-works' },
    ],
  },
]
