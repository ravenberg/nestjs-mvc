import { type InertiaPage, type InertiaTemplateContext, inertiaBody } from 'inertia-nest'

export function template(page: InertiaPage, ctx: InertiaTemplateContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NestJS × Inertia demo</title>
${ctx.assets()}
</head>
<body>${inertiaBody(page)}</body>
</html>`
}
