import type { PageObject, TemplateContext } from './types'

const escapeAttr = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

/** Renders the Inertia root element with the page object encoded in `data-page`. */
export function viewBody(page: PageObject, id = 'app'): string {
  return `<div id="${id}" data-page="${escapeAttr(JSON.stringify(page))}"></div>`
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
