/**
 * The sidebar. One entry per page under content/; the href is the route and
 * the file path is derived from it (see DocsService). From the first page
 * you build, through the basics, data and security, to the things a
 * production app needs.
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
      { title: 'How it works', href: '/docs/how-it-works' },
    ],
  },
  {
    title: 'The basics',
    links: [
      { title: 'Redirects', href: '/docs/redirects' },
      { title: 'Validation', href: '/docs/validation' },
      { title: 'Live validation', href: '/docs/live-validation' },
      { title: 'File uploads', href: '/docs/file-uploads' },
      { title: "Requests that aren't pages", href: '/docs/http-requests' },
      { title: 'Optimistic updates', href: '/docs/optimistic-updates' },
      { title: 'Remembering state', href: '/docs/remembering-state' },
    ],
  },
  {
    title: 'Data',
    links: [
      { title: 'Data on every page', href: '/docs/shared-data' },
      { title: 'Loading only what you need', href: '/docs/partial-reloads' },
      { title: 'Loading data later', href: '/docs/loading-data' },
      { title: 'Keeping data fresh', href: '/docs/polling' },
      { title: 'Data the browser keeps', href: '/docs/once' },
      { title: 'Growing lists', href: '/docs/merging-props' },
      { title: 'Infinite scroll', href: '/docs/infinite-scroll' },
      { title: 'Prefetching', href: '/docs/prefetching' },
    ],
  },
  {
    title: 'Security',
    links: [
      { title: 'Authentication', href: '/docs/authentication' },
      { title: 'Authorization', href: '/docs/authorization' },
      { title: 'CSRF protection', href: '/docs/csrf' },
      { title: 'Signed links', href: '/docs/signed-urls' },
      { title: 'Private history', href: '/docs/history-encryption' },
      { title: 'Content Security Policy', href: '/docs/content-security-policy' },
    ],
  },
  {
    title: 'Going further',
    links: [
      { title: 'Error pages', href: '/docs/error-pages' },
      { title: 'Server rendering', href: '/docs/server-rendering' },
      { title: 'Testing', href: '/docs/testing' },
      { title: 'TypeScript', href: '/docs/typescript' },
      { title: 'Going to production', href: '/docs/production' },
      { title: 'Using Fastify', href: '/docs/fastify' },
      { title: 'Acknowledgements', href: '/docs/acknowledgements' },
    ],
  },
]
