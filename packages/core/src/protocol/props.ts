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
  constructor(value: () => T | Promise<T>, readonly group: string = 'default') {
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

async function resolveValue(value: unknown): Promise<unknown> {
  if (value instanceof Prop) return value.resolve()
  if (typeof value === 'function') return (value as () => unknown)()
  return value
}

/**
 * Applies the Inertia prop-resolution rules:
 * - full load: plain/function/always props are included, optional props skipped,
 *   defer props skipped but listed in `deferredProps` per group
 * - partial reload: only the requested keys (minus `except`) are evaluated,
 *   always-props are included regardless
 * - merge props are listed in `mergeProps` unless reset via X-Inertia-Reset
 */
export async function resolveProps(
  raw: Record<string, unknown>,
  partial: PartialReload | null,
  reset: string[] = [],
): Promise<ResolvedProps> {
  const props: Record<string, unknown> = {}
  const deferredProps: Record<string, string[]> = {}
  const mergeProps: string[] = []

  for (const [key, value] of Object.entries(raw)) {
    const isAlways = value instanceof AlwaysProp

    if (partial) {
      if (!isAlways) {
        if (partial.only.length > 0 && !partial.only.includes(key)) continue
        if (partial.except.includes(key)) continue
      }
    } else {
      if (value instanceof OptionalProp) continue
      if (value instanceof DeferProp) {
        ;(deferredProps[value.group] ??= []).push(key)
        continue
      }
    }

    if (value instanceof MergeProp && !reset.includes(key)) mergeProps.push(key)
    props[key] = await resolveValue(value)
  }

  return { props, deferredProps, mergeProps }
}
