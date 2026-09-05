import { describe, expect, it } from 'vitest'
import { always, defer, merge, optional, resolveProps } from '../src/protocol/props'

describe('resolveProps', () => {
  const raw = () => ({
    plain: 'value',
    fn: () => 'computed',
    asyncFn: async () => 'awaited',
    opt: optional(() => 'optional'),
    deferred: defer(async () => 'deferred'),
    grouped: defer(() => 'grouped', 'sidebar'),
    flash: always('flash'),
    feed: merge(() => [1, 2]),
  })

  it('resolves a full load: evaluates functions, skips optional, defers deferred', async () => {
    const { props, deferredProps, mergeProps } = await resolveProps(raw(), null)

    expect(props).toEqual({ plain: 'value', fn: 'computed', asyncFn: 'awaited', flash: 'flash', feed: [1, 2] })
    expect(deferredProps).toEqual({ default: ['deferred'], sidebar: ['grouped'] })
    expect(mergeProps).toEqual(['feed'])
  })

  it('resolves a partial reload: only requested keys plus always-props', async () => {
    const { props, deferredProps } = await resolveProps(raw(), { only: ['deferred', 'opt'], except: [] })

    expect(props).toEqual({ deferred: 'deferred', opt: 'optional', flash: 'flash' })
    expect(deferredProps).toEqual({})
  })

  it('honours partial except', async () => {
    const { props } = await resolveProps(raw(), { only: [], except: ['plain', 'fn', 'asyncFn'] })

    expect(Object.keys(props).sort()).toEqual(['deferred', 'feed', 'flash', 'grouped', 'opt'])
  })

  it('drops merge markers for keys listed in reset', async () => {
    const { mergeProps } = await resolveProps(raw(), { only: ['feed'], except: [] }, { reset: ['feed'] })

    expect(mergeProps).toEqual([])
  })
})
