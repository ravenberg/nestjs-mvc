import { describe, expect, it, vi } from 'vitest'
import { always, defer, merge, optional, resolveProps } from '../src/protocol/props'

describe('nested prop resolution', () => {
  const nested = () => ({
    auth: () => ({
      user: { id: 1, name: 'Raven' },
      notifications: defer(async () => ['a', 'b']),
      invoices: optional(() => [{ id: 9 }]),
    }),
    stats: { visits: 10 },
  })

  it('announces deferred props nested in a closure using dot paths', async () => {
    const { props, deferredProps } = await resolveProps(nested(), null)

    expect(props).toEqual({ auth: { user: { id: 1, name: 'Raven' } }, stats: { visits: 10 } })
    expect(deferredProps).toEqual({ default: ['auth.notifications'] })
  })

  it('resolves a nested deferred prop when the client asks for its dot path', async () => {
    const { props, deferredProps } = await resolveProps(nested(), {
      only: ['auth.notifications'],
      except: [],
    })

    // Only the requested branch survives: siblings are pruned, not merely hidden.
    expect(props).toEqual({ auth: { notifications: ['a', 'b'] } })
    expect(deferredProps).toEqual({})
  })

  it('resolves a nested optional prop only when selected', async () => {
    const full = await resolveProps(nested(), null)
    expect(full.props.auth).not.toHaveProperty('invoices')

    const partial = await resolveProps(nested(), { only: ['auth.invoices'], except: [] })
    expect(partial.props).toEqual({ auth: { invoices: [{ id: 9 }] } })
  })

  it('does not evaluate closures guarding an unrequested branch', async () => {
    const authFactory = vi.fn(() => ({ user: { id: 1 } }))
    const raw = { auth: authFactory, stats: () => ({ visits: 1 }) }

    await resolveProps(raw, { only: ['stats'], except: [] })

    // Laziness is the whole point of partial reloads.
    expect(authFactory).not.toHaveBeenCalled()
  })

  it('prunes nested branches with dot-notation except', async () => {
    const { props } = await resolveProps(nested(), { only: [], except: ['auth.user'] })

    expect(props.auth).not.toHaveProperty('user')
    expect(props.auth).toHaveProperty('notifications')
    expect(props.stats).toEqual({ visits: 10 })
  })

  it('keeps always-props immune to filters within an evaluated branch', async () => {
    const raw = {
      auth: () => ({ user: { id: 1 }, flash: always('hi') }),
    }

    // `auth` is evaluated here (no `only` filter), so the nested always-prop
    // overrides `except` the way the top-level `errors` prop does.
    const { props } = await resolveProps(raw, { only: [], except: ['auth.flash'] })
    expect(props.auth).toHaveProperty('flash', 'hi')
    expect(props.auth).toHaveProperty('user')
  })

  it('does not let a nested always-prop resurrect a pruned ancestor', async () => {
    const authFactory = vi.fn(() => ({ flash: always('hi') }))

    const { props } = await resolveProps({ auth: authFactory }, { only: ['nothing'], except: [] })

    // Finding it would mean calling every closure on every partial reload, which
    // would defeat laziness. Immunity applies inside branches we already evaluate,
    // it does not force evaluation of ones we skipped.
    expect(props).toEqual({})
    expect(authFactory).not.toHaveBeenCalled()
  })

  it('records nested merge props by dot path and honours reset', async () => {
    const raw = { feed: () => ({ data: merge(() => [1, 2]) }) }

    const { props, mergeProps } = await resolveProps(raw, null)
    expect(props).toEqual({ feed: { data: [1, 2] } })
    expect(mergeProps).toEqual(['feed.data'])

    const reset = await resolveProps(raw, { only: ['feed'], except: [] }, ['feed.data'])
    expect(reset.mergeProps).toEqual([])
  })

  it('resolves special props inside arrays with indexed paths', async () => {
    const raw = { rows: [{ label: 'a', extra: optional(() => 'x') }] }

    const full = await resolveProps(raw, null)
    expect(full.props).toEqual({ rows: [{ label: 'a' }] })

    const partial = await resolveProps(raw, { only: ['rows.0.extra'], except: [] })
    expect(partial.props).toEqual({ rows: [{ extra: 'x' }] })
  })

  it('drops an ancestor whose requested branch yielded nothing', async () => {
    const raw = { auth: () => ({ user: { id: 1 } }) }

    const { props } = await resolveProps(raw, { only: ['auth.missing'], except: [] })
    expect(props).toEqual({})
  })

  it('does not walk into class instances', async () => {
    class Entity {
      constructor(
        readonly id: number,
        readonly createdAt: Date,
      ) {}
    }
    const entity = new Entity(1, new Date('2026-01-01'))

    const { props } = await resolveProps({ entity }, null)

    // Left untouched, so ORM models and Dates survive serialization intact.
    expect(props.entity).toBe(entity)
  })

  it('resolves deeply nested deferred props', async () => {
    const raw = {
      a: () => ({ b: { c: defer(() => 'deep', 'group') } }),
    }

    const { props, deferredProps } = await resolveProps(raw, null)
    expect(props).toEqual({ a: { b: {} } })
    expect(deferredProps).toEqual({ group: ['a.b.c'] })

    const partial = await resolveProps(raw, { only: ['a.b.c'], except: [] })
    expect(partial.props).toEqual({ a: { b: { c: 'deep' } } })
  })
})
