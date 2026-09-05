/**
 * Proves the Inertia v3 client can actually boot from the HTML shell this adapter
 * emits. Type-checking only proves API shape; this asserts the wire format is one a
 * real DOM parses correctly — the core risk of the v2 -> v3 embedding change.
 */
import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import { viewBody } from '../src/index'
import type { PageObject } from '../src/index'

const page: PageObject = {
  component: 'Home',
  props: { errors: {}, name: 'World', bio: '</script><script>alert(1)</script>' },
  url: '/users?a=1&b=2',
  version: 'dev',
}

function boot(html: string) {
  const window = new Window({ url: 'http://localhost:3000/' })
  window.document.body.innerHTML = html
  return window
}

describe('Inertia v3 client boot contract', () => {
  it('emits a script element the client can locate', () => {
    const window = boot(viewBody(page))
    const el = window.document.querySelector('script[type="application/json"]')

    expect(el).not.toBeNull()
    expect(el!.getAttribute('data-page')).toBe('app')
    expect(window.document.getElementById('app')).not.toBeNull()
  })

  it('survives prop data containing a literal closing script tag', () => {
    const window = boot(viewBody(page))

    // If the escaping were wrong, the browser would have split this into extra nodes
    // and the root div would have been re-parented.
    expect(window.document.querySelectorAll('script')).toHaveLength(1)
    expect(window.document.getElementById('app')!.parentNode).toBe(window.document.body)
  })

  it('round-trips the page object through real DOM parsing', () => {
    const window = boot(viewBody(page))
    const raw = window.document.querySelector('script[type="application/json"]')!.textContent

    // Exactly what the client does: read textContent, then JSON.parse it.
    expect(JSON.parse(raw!)).toEqual(page)
  })

  it('does not HTML-entity encode, which would break JSON.parse', () => {
    const html = viewBody(page)

    expect(html).not.toContain('&quot;')
    expect(html).not.toContain('&amp;')
    // The raw ampersand from the query string must survive verbatim.
    expect(html).toContain('a=1&b=2')
  })

  it('honours a custom root element id', () => {
    const window = boot(viewBody(page, 'root'))

    expect(window.document.getElementById('root')).not.toBeNull()
    expect(window.document.querySelector('script')!.getAttribute('data-page')).toBe('root')
  })
})
