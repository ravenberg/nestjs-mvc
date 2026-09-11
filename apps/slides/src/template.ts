import type { PageObject, TemplateContext } from 'nestjs-mvc'

export function template(page: PageObject, ctx: TemplateContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Slides</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Caveat:wght@600&display=swap">
${ctx.assets()}
${ctx.head()}
</head>
<body>${ctx.body()}</body>
</html>`
}
