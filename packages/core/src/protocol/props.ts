export type PropValue<T> = T | (() => T | Promise<T>)

/** Base class for special prop wrappers. */
export abstract class Prop<T = unknown> {
  constructor(protected readonly value: PropValue<T>) {}

  async resolve(): Promise<T> {
    return typeof this.value === 'function' ? await (this.value as () => T | Promise<T>)() : this.value
  }
}

/** Excluded from the initial load; only evaluated when explicitly requested in a partial reload. */
export class OptionalProp<T = unknown> extends Prop<T> {}

/** Excluded from the initial load and advertised via `deferredProps`; the client fetches it right after the first render. */
export class DeferProp<T = unknown> extends Prop<T> {
  constructor(
    value: () => T | Promise<T>,
    readonly group: string = 'default',
  ) {
    super(value)
  }
}

/** Included in every response, even partial reloads that don't request it. */
export class AlwaysProp<T = unknown> extends Prop<T> {}

/** Advertised via `mergeProps` so the client merges (e.g. appends arrays) instead of replacing. */
export class MergeProp<T = unknown> extends Prop<T> {}

export const optional = <T>(value: () => T | Promise<T>): OptionalProp<T> => new OptionalProp(value)
export const defer = <T>(value: () => T | Promise<T>, group?: string): DeferProp<T> => new DeferProp(value, group)
export const always = <T>(value: PropValue<T>): AlwaysProp<T> => new AlwaysProp(value)
export const merge = <T>(value: PropValue<T>): MergeProp<T> => new MergeProp(value)

export interface PartialReload {
  only: string[]
  except: string[]
}

export interface ResolvedProps {
  props: Record<string, unknown>
  deferredProps: Record<string, string[]>
  mergeProps: string[]
}

/**
 * Only plain objects are walked. Class instances (entities, `Date`, `Map`, …) are
 * treated as leaf values, so we never recurse into ORM models looking for props.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * How a path relates to the partial-reload filters:
 * - `full`     — requested itself, or nested under something requested
 * - `descend`  — not requested, but an ancestor of something that is, so we must
 *                evaluate it and keep only the requested branch
 * - `none`     — skip entirely, without evaluating
 */
type Match = 'full' | 'descend' | 'none'

function matchPath(path: string, partial: PartialReload | null): Match {
  if (!partial) return 'full'

  for (const except of partial.except) {
    if (path === except || path.startsWith(`${except}.`)) return 'none'
  }

  if (partial.only.length === 0) return 'full'

  for (const only of partial.only) {
    if (path === only || path.startsWith(`${only}.`)) return 'full'
  }
  for (const only of partial.only) {
    if (only.startsWith(`${path}.`)) return 'descend'
  }
  return 'none'
}

interface WalkState {
  partial: PartialReload | null
  reset: string[]
  deferredProps: Record<string, string[]>
  mergeProps: string[]
}

interface Resolved {
  include: boolean
  value?: unknown
}

async function resolveNode(value: unknown, path: string, state: WalkState): Promise<Resolved> {
  // Always-props ignore the partial filters, but only within a branch we already
  // evaluate: honouring them inside a pruned branch would mean calling every
  // closure on every partial reload, defeating laziness.
  const match = value instanceof AlwaysProp ? 'full' : matchPath(path, state.partial)
  if (match === 'none') return { include: false }

  if (state.partial === null) {
    if (value instanceof OptionalProp) return { include: false }
    if (value instanceof DeferProp) {
      // Announced by dot-path, grouped, and resolved in the client's follow-up request.
      ;(state.deferredProps[value.group] ??= []).push(path)
      return { include: false }
    }
  } else if ((value instanceof OptionalProp || value instanceof DeferProp) && match !== 'full') {
    // On a partial reload these resolve only when explicitly selected.
    return { include: false }
  }

  if (value instanceof MergeProp && !state.reset.includes(path)) state.mergeProps.push(path)

  const resolved =
    value instanceof Prop
      ? await value.resolve()
      : typeof value === 'function'
        ? await (value as () => unknown)()
        : value

  if (isPlainObject(resolved)) {
    const out: Record<string, unknown> = {}
    let kept = false
    for (const [key, child] of Object.entries(resolved)) {
      const result = await resolveNode(child, path === '' ? key : `${path}.${key}`, state)
      if (result.include) {
        out[key] = result.value
        kept = true
      }
    }
    // An ancestor-only match that yielded nothing contributes no prop at all.
    if (match === 'descend' && !kept) return { include: false }
    return { include: true, value: out }
  }

  if (Array.isArray(resolved)) {
    const out: unknown[] = []
    for (const [index, child] of resolved.entries()) {
      const result = await resolveNode(child, `${path}.${index}`, state)
      if (result.include) out.push(result.value)
    }
    return { include: true, value: out }
  }

  // A leaf that merely sits above a requested path holds nothing worth sending.
  if (match === 'descend') return { include: false }
  return { include: true, value: resolved }
}

/**
 * Applies the Inertia prop-resolution rules at any depth. Special props
 * (`optional`, `defer`, `always`, `merge`) are recognised inside plain objects,
 * arrays and the return values of closures, and every piece of metadata uses
 * dot-notation paths (`auth.notifications`) just like the client's `only`/`except`.
 *
 * - full load: plain/function/always props are included, optional props skipped,
 *   defer props skipped but listed in `deferredProps` per group
 * - partial reload: only the requested paths (minus `except`) are evaluated, so a
 *   closure guarding an unrequested branch is never called; always-props are
 *   included regardless
 * - merge props are listed in `mergeProps` unless reset via X-Inertia-Reset
 */
export async function resolveProps(
  raw: Record<string, unknown>,
  partial: PartialReload | null,
  reset: string[] = [],
): Promise<ResolvedProps> {
  const state: WalkState = { partial, reset, deferredProps: {}, mergeProps: [] }
  const props: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    const result = await resolveNode(value, key, state)
    if (result.include) props[key] = result.value
  }

  return { props, deferredProps: state.deferredProps, mergeProps: state.mergeProps }
}
