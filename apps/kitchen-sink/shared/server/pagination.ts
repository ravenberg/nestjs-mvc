import type { ScrollPage } from 'nestjs-mvc'
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm'

/**
 * Pagination over TypeORM query builders, shaped for `scroll()`: the rows under
 * `data` plus the cursor fields the adapter reads (`currentPage`, `previousPage`,
 * `nextPage`, `pageName`). Anything else (`total`, `perPage`) rides along to the
 * client as ordinary props.
 */

export interface OffsetOptions<T, R> {
  /** The requested page, straight from `@Query('page')`; anything invalid means 1. */
  page?: string | number
  perPage?: number
  /** Query parameter the client uses to ask for a page. Defaults to `page`. */
  pageName?: string
  map?: (row: T) => R
}

export interface OffsetPage<R> extends ScrollPage<R> {
  data: R[]
  currentPage: number
  previousPage: number | null
  nextPage: number | null
  total: number
  perPage: number
  lastPage: number
}

/** Classic page-number pagination; both directions are known, so the client can scroll either way. */
export async function paginate<T extends ObjectLiteral, R = T>(
  query: SelectQueryBuilder<T>,
  options: OffsetOptions<T, R> = {},
): Promise<OffsetPage<R>> {
  const perPage = options.perPage ?? 15
  const currentPage = Math.max(1, Math.floor(Number(options.page)) || 1)

  const [rows, total] = await query
    .skip((currentPage - 1) * perPage)
    .take(perPage)
    .getManyAndCount()
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const map = options.map ?? ((row: T) => row as unknown as R)

  return {
    data: rows.map(map),
    pageName: options.pageName ?? 'page',
    currentPage,
    previousPage: currentPage > 1 ? currentPage - 1 : null,
    nextPage: currentPage < lastPage ? currentPage + 1 : null,
    total,
    perPage,
    lastPage,
  }
}

export interface CursorOptions<T, R> {
  /** The cursor the client sent, straight from `@Query('cursor')`; absent means the first page. */
  after?: string | number
  perPage?: number
  /** Query parameter the client uses to send the cursor. Defaults to `cursor`. */
  cursorName?: string
  /** Unique, ordered column the cursor points at. Defaults to `id`. */
  column?: string
  map?: (row: T) => R
}

export interface CursorPage<R> extends ScrollPage<R> {
  data: R[]
  currentPage: number | string
  previousPage: null
  nextPage: number | string | null
}

/**
 * Keyset pagination: "everything after this id", one query, no count, stable
 * under inserts. Forward-only, so `previousPage` is always `null`.
 */
export async function paginateAfter<T extends ObjectLiteral, R = T>(
  query: SelectQueryBuilder<T>,
  options: CursorOptions<T, R> = {},
): Promise<CursorPage<R>> {
  const perPage = options.perPage ?? 15
  const column = `${query.alias}.${options.column ?? 'id'}`
  const after = options.after === undefined || options.after === '' ? null : options.after

  if (after !== null) query.andWhere(`${column} > :after`, { after })
  const rows = await query
    .orderBy(column, 'ASC')
    .take(perPage + 1) // one extra tells us whether there is a next page
    .getMany()

  const hasMore = rows.length > perPage
  const page = hasMore ? rows.slice(0, perPage) : rows
  const last = page.at(-1) as Record<string, unknown> | undefined
  const map = options.map ?? ((row: T) => row as unknown as R)

  return {
    data: page.map(map),
    pageName: options.cursorName ?? 'cursor',
    // Like Laravel's cursor paginator, the first page identifies itself as 1.
    currentPage: after ?? 1,
    previousPage: null,
    nextPage: hasMore && last ? (last[options.column ?? 'id'] as number | string) : null,
  }
}
