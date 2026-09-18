/**
 * The sidebar. One entry per page under content/; the href is the route and
 * the file path is derived from it (see DocsService). Three sections of
 * guides, from the first page you build to the things a production app
 * needs, then a reference with one page per feature.
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
  {
    // One page per feature, for when the guides above aren't enough: every
    // option, what goes over the wire, how it combines with the rest.
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
