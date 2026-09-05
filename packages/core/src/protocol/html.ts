import type { PageObject, TemplateContext } from './types'

/**
 * Serializes the page object for embedding inside a `<script>` element.
 *
 * The protocol requires every forward slash to be escaped as `\/` so a `</script>`
 * sequence inside prop data cannot close the element early. HTML-entity encoding
 * MUST NOT be used here: browsers do not decode entities inside a script body, so
 * the JSON would fail to parse.
 */
const encodePage = (page: PageObject): string => JSON.stringify(page).replaceAll('/', '\\/')

/**
 * Renders the Inertia root element plus the `<script type="application/json">`
 * element carrying the page object, as required by the Inertia v3 protocol.
 * (v2 embedded the page in a `data-page` attribute; v3 clients no longer read that.)
 */
export function viewBody(page: PageObject, id = 'app'): string {
  return `<script data-page="${id}" type="application/json">${encodePage(page)}</script><div id="${id}"></div>`
}

/** Minimal HTML shell used when no `template` option is configured. */
export function defaultTemplate(page: PageObject, ctx?: TemplateContext): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${ctx?.assets() ?? ''}
</head>
<body>${viewBody(page)}</body>
</html>`
}
