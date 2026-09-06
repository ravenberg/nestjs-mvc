import type { PageObject, TemplateContext } from 'nestjs-mvc'

export function template(page: PageObject, ctx: TemplateContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NestJS MVC demo</title>
${ctx.assets()}
${ctx.head()}
</head>
<body>${ctx.body()}</body>
</html>`
}
