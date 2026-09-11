import Markdoc, { type RenderableTreeNode } from '@markdoc/markdoc'
import React from 'react'
import { Callout } from './Callout'
import { Fence } from './Fence'
import { QuickLink, QuickLinks } from './QuickLinks'

function Figure({ src, alt = '', caption }: { src: string; alt?: string; caption?: string }) {
  return (
    <figure>
      <img src={src} alt={alt} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

/** The tag names the server's Markdoc schema emits, mapped to components. */
const components = { Fence, Callout, QuickLinks, QuickLink, Figure }

/** Renders the tree the controller sent: Markdoc's renderable tree survives JSON as is. */
export function Markdown({ content }: { content: RenderableTreeNode }) {
  return <>{Markdoc.renderers.react(content, React, { components })}</>
}
