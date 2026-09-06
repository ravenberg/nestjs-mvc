import { Controller, Get, Query } from '@nestjs/common'
import { View, deepMerge, merge, prepend } from 'nestjs-mvc'

/**
 * Data Loading → Prop Merging. Every reload bumps `tick`; each prop shows one
 * merge strategy on the same data, so the difference is in how the client
 * combines the response with what it already has:
 *
 * - `appended`  — `merge()`: new items go after the existing ones
 * - `prepended` — `prepend()`: new items go in front
 * - `matched`   — `merge()` + `matchOn: 'id'`: an item with a known id is
 *                 updated in place, a new id is added
 * - `deep`      — `deepMerge()`: objects merge key by key, arrays inside them
 *                 merge (and match) too
 *
 * A reset (`router.reload({ reset: [...] })`) makes the client replace instead.
 */
@Controller('features/data-loading')
export class PropMergingController {
  @Get('prop-merging')
  @View('Features/DataLoading/PropMerging')
  page(@Query('tick') tick?: string) {
    const n = Math.max(0, Number(tick) || 0)
    const stamp = new Date().toLocaleTimeString()

    return {
      tick: n,
      appended: merge(() => [{ id: n, label: `item ${n}`, stamp }]),
      prepended: prepend(() => [{ id: n, label: `item ${n}`, stamp }]),
      // id 1 is re-sent on every tick with a new count: matched in place, never duplicated.
      matched: merge(() => [{ id: 1, label: 'always id 1', count: n, stamp }, { id: n + 100, label: `new ${n + 100}`, count: 0, stamp }], {
        matchOn: 'id',
      }),
      deep: deepMerge(
        () => ({
          counts: { [`tick${n}`]: n, total: n },
          items: [{ id: 1, seen: n, stamp }, { id: n + 10, seen: 1, stamp }],
        }),
        { matchOn: 'items.id' },
      ),
    }
  }
}
