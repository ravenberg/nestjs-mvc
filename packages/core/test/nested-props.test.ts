import { describe, expect, it, vi } from 'vitest'
import { always, defer, merge, once, optional, resolveProps, scroll } from '../src/protocol/props'

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

  it('sends an always-prop whole on a partial reload that asks for something else', async () => {
    const raw = {
      errors: always({ title: 'Give the incident a title.', createUser: { email: 'Taken.' } }),
      report: always(() => ({ route: { path: '/incidents/:id' }, count: 3, tags: [{ id: 1 }] })),
      timeline: [1, 2],
      other: 'x',
    }

    const { props } = await resolveProps(raw, { only: ['timeline'], except: [] })

    // The client replaces a top-level prop wholesale, so a child left out here
    // would be gone there: a failed form would look like it succeeded.
    expect(props).toEqual({
      errors: { title: 'Give the incident a title.', createUser: { email: 'Taken.' } },
      report: { route: { path: '/incidents/:id' }, count: 3, tags: [{ id: 1 }] },
      timeline: [1, 2],
    })
  })

  it('keeps an always-prop whole against only and except naming its children', async () => {
    const raw = () => ({
      errors: always({ 'user.name': 'Required.', email: 'Invalid.' }),
      list: always([{ id: 1 }, { id: 2 }]),
    })
    const whole = { errors: { 'user.name': 'Required.', email: 'Invalid.' }, list: [{ id: 1 }, { id: 2 }] }

    expect((await resolveProps(raw(), { only: ['errors.email'], except: [] })).props).toEqual(whole)
    expect((await resolveProps(raw(), { only: [], except: ['errors.user', 'list.0'] })).props).toEqual(whole)
    expect((await resolveProps(raw(), { only: [], except: ['errors', 'list'] })).props).toEqual(whole)
  })

  it('sends a nested always-prop whole within an evaluated branch', async () => {
    const raw = { auth: () => ({ user: { id: 1 }, flash: always({ message: 'Saved', level: 'info' }) }) }

    const { props } = await resolveProps(raw, { only: ['auth.user'], except: [] })
    expect(props).toEqual({ auth: { user: { id: 1 }, flash: { message: 'Saved', level: 'info' } } })
  })

  it('resolves optional and deferred props inside an always-prop on a partial reload', async () => {
    const slow = vi.fn(() => 'slow')
    const heavy = vi.fn(() => 'heavy')
    const raw = () => ({ report: always({ count: 3, slow: defer(slow), heavy: optional(heavy) }), timeline: [1] })

    // A full load keeps their own rules: deferred is announced, optional left out.
    const full = await resolveProps(raw(), null)
    expect(full.props.report).toEqual({ count: 3 })
    expect(full.deferredProps).toEqual({ default: ['report.slow'] })
    expect(slow).not.toHaveBeenCalled()
    expect(heavy).not.toHaveBeenCalled()

    // A partial reload replaces `report` on the client, so a deferred value left
    // out would disappear from the page with nothing to fetch it back.
    const partial = await resolveProps(raw(), { only: ['timeline'], except: [] })
    expect(partial.props).toEqual({ report: { count: 3, slow: 'slow', heavy: 'heavy' }, timeline: [1] })
    expect(partial.deferredProps).toEqual({})
  })

  it('sends merge and scroll props inside an always-prop unlabelled unless the reload asks for them', async () => {
    const page = { data: [1, 2], currentPage: 1, nextPage: 2, previousPage: null }
    const raw = () => ({
      report: always({
        feed: merge(() => [{ id: 1 }], { matchOn: 'id' }),
        items: scroll(() => page),
        later: scroll(() => page, { defer: true }),
      }),
      timeline: [1],
    })
    const cursor = { pageName: 'page', previousPage: null, nextPage: 2, currentPage: 1 }

    // Labelled, the client would append the same items again on every poll.
    const other = await resolveProps(raw(), { only: ['timeline'], except: [] })
    expect(other.props.report).toEqual({ feed: [{ id: 1 }], items: page, later: page })
    expect(other.mergeProps).toEqual([])
    expect(other.matchPropsOn).toEqual([])
    expect(other.deferredProps).toEqual({})
    // The scroll pages it had are replaced, so its cursor starts over.
    expect(other.scrollProps).toEqual({
      'report.items': { ...cursor, reset: true },
      'report.later': { ...cursor, reset: true },
    })

    const asked = await resolveProps(raw(), { only: ['report.feed', 'report.items'], except: [] })
    expect(asked.mergeProps).toEqual(['report.feed', 'report.items.data'])
    expect(asked.matchPropsOn).toEqual(['report.feed.id'])
    expect(asked.scrollProps['report.items'].reset).toBe(false)
  })

  it('leaves out a once prop inside an always-prop that the client still holds', async () => {
    const countries = vi.fn(() => ['NL', 'BE'])
    const raw = () => ({ form: always({ title: 'New', countries: once(countries, { until: 60 }) }), timeline: [1] })

    // The client fills `form.countries` back in from its own copy, and keeps its
    // own metadata: new metadata would push the copy's expiry forward.
    const held = await resolveProps(raw(), { only: ['timeline'], except: [] }, { loadedOnce: ['form.countries'] })
    expect(held.props).toEqual({ form: { title: 'New' }, timeline: [1] })
    expect(held.onceProps).toEqual({})
    expect(countries).not.toHaveBeenCalled()

    // Not held yet, or marked for refresh: resolved.
    const missing = await resolveProps(raw(), { only: ['timeline'], except: [] })
    expect(missing.props.form).toEqual({ title: 'New', countries: ['NL', 'BE'] })
    expect(missing.onceProps).toHaveProperty(['form.countries', 'prop'], 'form.countries')
    const refreshed = await resolveProps(
      raw(),
      { only: ['timeline'], except: [] },
      { loadedOnce: ['form.countries'], refreshOnce: ['form.countries'] },
    )
    expect(refreshed.props.form).toEqual({ title: 'New', countries: ['NL', 'BE'] })
    expect(countries).toHaveBeenCalledTimes(2)
  })

  it('resolves a held once prop inside an always-prop when the reload asks for it', async () => {
    const options = vi.fn(() => ({ countries: ['NL'], currencies: ['EUR'] }))
    const raw = () => ({ form: always({ title: 'New', options: once(options) }), timeline: [1] })
    const whole = { title: 'New', options: { countries: ['NL'], currencies: ['EUR'] } }
    const held = { loadedOnce: ['form.options'] }

    // By name, through the always-prop, through a path inside it, and through an
    // except-only reload that leaves it in: resolved afresh, as outside an always-prop.
    for (const partial of [
      { only: ['form.options'], except: [] },
      { only: ['form'], except: [] },
      { only: ['form.options.countries'], except: [] },
      { only: [], except: ['timeline'] },
    ]) {
      expect((await resolveProps(raw(), partial, held)).props.form).toEqual(whole)
    }
    expect(options).toHaveBeenCalledTimes(4)
  })

  it('honours fresh and the shared key of a once prop inside an always-prop', async () => {
    const countries = vi.fn(() => ['NL', 'BE'])
    const partial = { only: ['timeline'], except: [] }

    const fresh = await resolveProps(
      { form: always({ countries: once(countries, { fresh: true }) }), timeline: [1] },
      partial,
      { loadedOnce: ['form.countries'] },
    )
    expect(fresh.props.form).toEqual({ countries: ['NL', 'BE'] })
    expect(countries).toHaveBeenCalledOnce()

    const shared = await resolveProps(
      { form: always({ countries: once(countries, { as: 'countries' }) }), timeline: [1] },
      partial,
      { loadedOnce: ['countries'] },
    )
    expect(shared.props.form).toEqual({})
    expect(countries).toHaveBeenCalledOnce()
  })

  it('records nested merge props by dot path and honours reset', async () => {
    const raw = { feed: () => ({ data: merge(() => [1, 2]) }) }

    const { props, mergeProps } = await resolveProps(raw, null)
    expect(props).toEqual({ feed: { data: [1, 2] } })
    expect(mergeProps).toEqual(['feed.data'])

    const reset = await resolveProps(raw, { only: ['feed'], except: [] }, { reset: ['feed.data'] })
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
