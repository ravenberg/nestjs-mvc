/**
 * Pages that no longer exist, and where their content lives now. Each one
 * answers with a permanent redirect, so links from outside keep working.
 */
export const moved: Record<string, string> = {
  // The feature reference, folded into the guides.
  view: '/docs/your-first-page#in-detail',
  'view-service': '/docs/redirects#in-detail',
  'shared-props': '/docs/shared-data#in-detail',
  ssr: '/docs/server-rendering#in-detail',
  'encrypt-history': '/docs/history-encryption#in-detail',
  'lazy-props': '/docs/your-first-page#props-that-do-some-work',
  defer: '/docs/loading-data#load-after-the-page-shows',
  optional: '/docs/loading-data#load-only-when-asked',
  always: '/docs/shared-data#data-that-must-stay-fresh',
  merge: '/docs/merging-props',
  scroll: '/docs/infinite-scroll',
  'once-props': '/docs/once',
  'partial-reloads': '/docs/loading-data#asking-for-props-by-name',
  polling: '/docs/loading-data#refresh-on-a-timer',
  'prefetch-requests': '/docs/prefetching#in-detail',
  validation: '/docs/forms',
  'error-bags': '/docs/forms#two-forms-on-one-page',
  flash: '/docs/flash-messages',
  precognition: '/docs/live-validation',
  'login-redirects': '/docs/authentication#in-detail',
  'skip-csrf': '/docs/csrf#webhooks-and-apis',
  'signed-url-api': '/docs/signed-urls#in-detail',
}
