import { Prism } from 'prism-react-renderer'

type Grammar = Record<string, unknown>
const languages = Prism.languages as unknown as Record<string, Grammar> & {
  extend(id: string, redef: Grammar): Grammar
  insertBefore(inside: string, before: string, insert: Grammar): Grammar
}

/**
 * Vue single-file components, which prism-react-renderer does not ship: HTML,
 * with the `<script>` block as TypeScript and `{{ }}` as expressions. The
 * tokens keep Prism's usual names, so the NestJS palette in app.css applies.
 */
if (!languages.vue) {
  languages.vue = languages.extend('markup', {})
  languages.insertBefore('vue', 'tag', {
    script: {
      pattern: /(<script\b[^>]*>)[\s\S]*?(?=<\/script>)/i,
      lookbehind: true,
      inside: languages.typescript,
    },
    interpolation: {
      pattern: /\{\{[\s\S]*?\}\}/,
      inside: {
        punctuation: /^\{\{|\}\}$/,
        rest: languages.typescript,
      },
    },
  })
}
