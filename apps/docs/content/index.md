---
title: Getting started
---

The documentation is being written. This page is the placeholder that proves the pipeline: a Markdoc file in `content/`, loaded by a NestJS controller, rendered on the server. {% .lead %}

{% quick-links %}

{% quick-link title="Installation" icon="installation" href="/docs/installation" description="Placeholder for the install and setup walk-through." /%}

{% quick-link title="Kitchen sink" icon="plugins" href="https://github.com/ravenberg/nestjs-mvc/tree/main/apps/kitchen-sink" description="Every feature has a page in the kitchen sink while the docs catch up." /%}

{% /quick-links %}

---

## How this page is built

The controller reads this file, Markdoc turns it into a tree, and the tree is the page's props. The table of contents on the right comes from the headings.

```ts
@Controller()
@Ssr()
export class DocsController {
  @Get('/')
  @View('Docs/Page')
  home() {
    return this.docs.page('/')
  }
}
```

{% callout title="Placeholder" %}
Real content replaces this file. Nothing here is final.
{% /callout %}

### Code, callouts and links

Inline `code`, a [link](/docs/installation), and a fenced block above. That is the whole vocabulary the pipeline supports today.
