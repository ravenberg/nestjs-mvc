import type { PageObject, TemplateContext } from 'nestjs-mvc'

/**
 * The HTML shell. The inline script applies the stored theme before the first
 * paint so a dark-mode visitor never sees a white flash; the same logic lives
 * in frontend/lib/theme.ts for the selector.
 */
export function template(page: PageObject, ctx: TemplateContext): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full antialiased">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>
  (function () {
    try {
      var stored = localStorage.getItem('theme')
      var dark = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', dark)
    } catch (e) {}
  })()
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap">
${ctx.assets()}
${ctx.head()}
</head>
<body class="flex min-h-full bg-white dark:bg-slate-900">${ctx.body()}</body>
</html>`
}
