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
      { title: 'File uploads', href: '/docs/file-uploads' },
      { title: 'Live validation', href: '/docs/live-validation' },
    ],
  },
  {
    title: 'Data',
    links: [
      { title: 'Data on every page', href: '/docs/shared-data' },
      { title: 'Loading data later', href: '/docs/loading-data' },
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
      { title: 'Going to production', href: '/docs/production' },
      { title: 'Using Fastify', href: '/docs/fastify' },
      { title: 'Acknowledgements', href: '/docs/acknowledgements' },
    ],
  },
  {
    // Temporary: each page moves into an "In detail" section of its guide,
    // then this section goes.
    title: 'Feature reference',
    links: [
      { title: '@View()', href: '/docs/view' },
      { title: 'ViewService', href: '/docs/view-service' },
      { title: 'Shared props', href: '/docs/shared-props' },
      { title: '@Ssr()', href: '/docs/ssr' },
      { title: 'History encryption', href: '/docs/encrypt-history' },
      { title: 'Lazy props', href: '/docs/lazy-props' },
      { title: 'defer()', href: '/docs/defer' },
      { title: 'optional()', href: '/docs/optional' },
      { title: 'always()', href: '/docs/always' },
      { title: 'merge(), prepend(), deepMerge()', href: '/docs/merge' },
      { title: 'scroll()', href: '/docs/scroll' },
      { title: 'once()', href: '/docs/once-props' },
      { title: 'Partial reloads', href: '/docs/partial-reloads' },
      { title: 'Polling', href: '/docs/polling' },
      { title: 'Prefetch requests', href: '/docs/prefetch-requests' },
      { title: 'Validation', href: '/docs/validation' },
      { title: 'Error bags', href: '/docs/error-bags' },
      { title: 'Flash data', href: '/docs/flash' },
      { title: 'Precognition', href: '/docs/precognition' },
      { title: 'Login redirects', href: '/docs/login-redirects' },
      { title: '@SkipCsrf()', href: '/docs/skip-csrf' },
      { title: 'SignedUrls', href: '/docs/signed-url-api' },
    ],
  },
]
