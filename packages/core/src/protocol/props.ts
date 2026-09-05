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

/** The cursor the client keeps per scroll prop; page identifiers may be numbers (offset) or strings (cursor). */
export interface ScrollMetadata {
  /** Query parameter the client sends to fetch a page, e.g. `page` or `cursor`. */
  pageName: string
  previousPage: number | string | null
  nextPage: number | string | null
  currentPage: number | string | null
}

/**
 * What a `scroll()` closure returns: the items under a wrapper key (`data` by
 * default) plus the paginator's cursor. Extra fields (`total`, …) travel to the
 * client untouched.
 */
export interface ScrollPage<T = unknown> extends Partial<ScrollMetadata> {
  data?: T[]
  [key: string]: unknown
}

export interface ScrollOptions<T = unknown> {
  /** Key holding the array the client merges. Defaults to `data`. */
  wrapper?: string
  /** Defer the first page like `defer()` does; `true` uses the default group. */
  defer?: boolean | string
  /** Derive the cursor from a value that is not a `ScrollPage`. */
  metadata?: (value: T) => ScrollMetadata
}

/**
 * A paginated list the client extends page by page: its inner array is labelled
 * for merging and the page object carries the cursor under `scrollProps`.
 */
export class ScrollProp<T = unknown> extends Prop<T> {
  readonly wrapper: string
  readonly deferGroup: string | null
  private readonly metadata?: (value: T) => ScrollMetadata

  constructor(value: () => T | Promise<T>, options: ScrollOptions<T> = {}) {
    super(value)
    this.wrapper = options.wrapper ?? 'data'
    this.deferGroup = options.defer === true ? 'default' : options.defer || null
    this.metadata = options.metadata
  }

  /** Reads the cursor off the resolved value, or through the custom `metadata` reader. */
  cursor(resolved: T, path: string): ScrollMetadata {
    if (this.metadata) return this.metadata(resolved)

    const page = resolved as ScrollPage
    if (!isPlainObject(page) || !Array.isArray(page[this.wrapper])) {
      throw new Error(
        `[nestjs-mvc] scroll() prop "${path}" must resolve to an object with a "${this.wrapper}" array ` +
          '(a ScrollPage), or pass a `metadata` reader for your own paginator shape.',
      )
    }
    return {
      pageName: page.pageName ?? 'page',
      previousPage: page.previousPage ?? null,
      nextPage: page.nextPage ?? null,
      currentPage: page.currentPage ?? null,
    }
  }
}

export interface OnceOptions {
  /** Cache key shared across pages; defaults to the prop's dot path. */
  as?: string
  /** Time to live in seconds, or an absolute expiry. Omit to cache until a full page load. */
  until?: number | Date
  /** Resolve and send again even if the client says it has this key — after a mutation, say. */
  fresh?: boolean
}

/**
 * Resolved once, then remembered by the client across visits. The client lists
 * the keys it holds in `X-Inertia-Except-Once-Props`; for those the closure is
 * not called and the prop is left out, and the client fills its copy back in.
 * Every instance is immutable and holds no cache: the server stays stateless.
 */
export class OnceProp<T = unknown> extends Prop<T> {
  readonly key: string | undefined
  readonly fresh: boolean
  private readonly until: number | Date | undefined

  constructor(value: () => T | Promise<T>, options: OnceOptions = {}) {
    super(value)
    this.key = options.as
    this.fresh = options.fresh ?? false
    this.until = options.until
  }

  /** Epoch milliseconds the client should drop its copy at, or `null` for "until a full page load". */
  expiresAt(now: number = Date.now()): number | null {
    if (this.until === undefined) return null
    return this.until instanceof Date ? this.until.getTime() : now + this.until * 1000
  }
}

export const optional = <T>(value: () => T | Promise<T>): OptionalProp<T> => new OptionalProp(value)
export const defer = <T>(value: () => T | Promise<T>, group?: string): DeferProp<T> => new DeferProp(value, group)
export const always = <T>(value: PropValue<T>): AlwaysProp<T> => new AlwaysProp(value)
export const merge = <T>(value: PropValue<T>): MergeProp<T> => new MergeProp(value)
export const scroll = <T = ScrollPage>(value: () => T | Promise<T>, options?: ScrollOptions<T>): ScrollProp<T> =>
  new ScrollProp(value, options)
export const once = <T>(value: () => T | Promise<T>, options?: OnceOptions): OnceProp<T> => new OnceProp(value, options)

/** Sent by the client's InfiniteScroll component: which end of the list the page belongs to. */
export type MergeIntent = 'append' | 'prepend'

export interface PartialReload {
  only: string[]
  except: string[]
}

export interface OnceMetadata {
  /** Dot path of the prop the cached value belongs to. */
  prop: string
  expiresAt: number | null
}

export interface ResolvedProps {
  props: Record<string, unknown>
  deferredProps: Record<string, string[]>
  mergeProps: string[]
  prependProps: string[]
  scrollProps: Record<string, ScrollMetadata & { reset: boolean }>
  onceProps: Record<string, OnceMetadata>
}

/** Everything the request tells the resolver, all read from headers; nothing here outlives the request. */
export interface ResolveOptions {
  /** Paths from `X-Inertia-Reset`. */
  reset?: string[]
  /** From `X-Inertia-Infinite-Scroll-Merge-Intent`. */
  mergeIntent?: MergeIntent
  /** Once keys the client already holds, from `X-Inertia-Except-Once-Props`. */
  loadedOnce?: string[]
  /** Once keys to resolve anyway, from `ViewService.refresh()` on a previous request. */
  refreshOnce?: string[]
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
  mergeIntent: MergeIntent
  loadedOnce: string[]
  refreshOnce: string[]
  deferredProps: Record<string, string[]>
  mergeProps: string[]
  prependProps: string[]
  scrollProps: Record<string, ScrollMetadata & { reset: boolean }>
  onceProps: Record<string, OnceMetadata>
}

/** Labels the array inside a scroll prop for the client, on the end the request asked for. */
function labelScrollMerge(prop: ScrollProp, path: string, state: WalkState): void {
  if (state.reset.includes(path)) return
  const target = state.mergeIntent === 'prepend' ? state.prependProps : state.mergeProps
  target.push(`${path}.${prop.wrapper}`)
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

  const deferred = value instanceof DeferProp || (value instanceof ScrollProp && value.deferGroup !== null)

  // The metadata is sent whether or not the value is: it is what lets the client
  // fill its remembered copy back in. On a partial reload the client asked for
  // this path explicitly, so it is always resolved afresh.
  if (value instanceof OnceProp && (state.partial === null || match === 'full')) {
    state.onceProps[value.key ?? path] = { prop: path, expiresAt: value.expiresAt() }
  }

  if (state.partial === null) {
    if (value instanceof OptionalProp) return { include: false }
    if (
      value instanceof OnceProp &&
      !value.fresh &&
      !state.refreshOnce.includes(value.key ?? path) &&
      state.loadedOnce.includes(value.key ?? path)
    ) {
      // The client still has it: skip the closure and leave the prop out.
      return { include: false }
    }
    if (deferred) {
      // Announced by dot-path, grouped, and resolved in the client's follow-up request.
      const group = value instanceof DeferProp ? value.group : (value as ScrollProp).deferGroup!
      ;(state.deferredProps[group] ??= []).push(path)
      // A deferred scroll prop still tells the client how its pages merge; the
      // cursor arrives with the first page.
      if (value instanceof ScrollProp) labelScrollMerge(value, path, state)
      return { include: false }
    }
  } else if ((value instanceof OptionalProp || deferred) && match !== 'full') {
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

  if (value instanceof ScrollProp) {
    labelScrollMerge(value, path, state)
    // `reset` tells the client to forget its cursor and re-sync to this page.
    state.scrollProps[path] = { ...value.cursor(resolved, path), reset: state.reset.includes(path) }
  }

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
 * - scroll props label their inner array in `mergeProps` or `prependProps`
 *   (per `mergeIntent`, from X-Inertia-Infinite-Scroll-Merge-Intent) and emit
 *   their cursor under `scrollProps`; a reset drops the label and flags the cursor
 * - once props are skipped when their key is in `loadedOnce` (unless `fresh`),
 *   and always described in `onceProps` so the client can fill its copy back in
 */
export async function resolveProps(
  raw: Record<string, unknown>,
  partial: PartialReload | null,
  options: ResolveOptions = {},
): Promise<ResolvedProps> {
  const state: WalkState = {
    partial,
    reset: options.reset ?? [],
    mergeIntent: options.mergeIntent ?? 'append',
    loadedOnce: options.loadedOnce ?? [],
    refreshOnce: options.refreshOnce ?? [],
    deferredProps: {},
    mergeProps: [],
    prependProps: [],
    scrollProps: {},
    onceProps: {},
  }
  const props: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    const result = await resolveNode(value, key, state)
    if (result.include) props[key] = result.value
  }

  return {
    props,
    deferredProps: state.deferredProps,
    mergeProps: state.mergeProps,
    prependProps: state.prependProps,
    scrollProps: state.scrollProps,
    onceProps: state.onceProps,
  }
}
