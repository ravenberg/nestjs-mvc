import { Body, Controller, Get, Inject, Post, Query, UnprocessableEntityException } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'
import { z } from 'zod'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const stamp = () => new Date().toISOString()

const CITIES = ['Amsterdam', 'Antwerp', 'Berlin', 'Bruges', 'Copenhagen', 'Delft', 'Dublin', 'Eindhoven', 'Ghent', 'Hamburg', 'Leiden', 'Lisbon', 'Madrid', 'Maastricht', 'Oslo', 'Paris', 'Rotterdam', 'Utrecht', 'Vienna', 'Zurich']

const EchoSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters.'),
  amount: z.coerce.number().positive('Must be a positive number.'),
})

/**
 * Events & Lifecycle, Error Handling, HTTP: pages that exercise the client's
 * event system, its progress bar, network failures, and `useHttp` for plain
 * JSON endpoints next to Inertia pages.
 */
@Controller('features')
export class EventsController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  // ── events & lifecycle ───────────────────────────────────────────────────

  @Get('events/global')
  @View('Features/Events/GlobalEvents')
  globalEvents() {
    return { renderedAt: stamp() }
  }

  @Get('events/callbacks')
  @View('Features/Events/VisitCallbacks')
  callbacks() {
    return { renderedAt: stamp() }
  }

  /** A visit target that takes its time; `?fail=1` makes it throw. */
  @Get('events/slow')
  @View('Features/Events/Slow')
  async slow(@Query('ms') ms?: string, @Query('fail') fail?: string) {
    await sleep(Math.min(5000, Number(ms) || 1500))
    if (fail === '1') throw new Error('The slow endpoint failed on purpose.')
    return { renderedAt: stamp(), waited: Math.min(5000, Number(ms) || 1500) }
  }

  @Get('events/progress')
  @View('Features/Events/Progress')
  progress() {
    return { renderedAt: stamp() }
  }

  // ── error handling: network ──────────────────────────────────────────────

  @Get('errors/network')
  @View('Features/Errors/Network')
  network() {
    return { renderedAt: stamp() }
  }

  /** Never answers within any sane timeout: what a dead server looks like to the client. */
  @Get('errors/network/hang')
  async hang() {
    await sleep(60_000)
    return {}
  }

  // ── http: plain JSON endpoints for useHttp ───────────────────────────────

  @Get('http/use-http')
  @View('Features/Http/UseHttp')
  useHttpPage() {
    return { renderedAt: stamp() }
  }

  /** A JSON search endpoint: no @View(), so it is an ordinary Nest handler. */
  @Get('http/cities')
  async cities(@Query('q') q = '') {
    await sleep(300)
    const term = q.trim().toLowerCase()
    return { query: q, results: CITIES.filter((c) => c.toLowerCase().includes(term)).slice(0, 8), at: stamp() }
  }

  /**
   * A JSON mutation. `useHttp` (built on the Precognition client) expects
   * validation failures as 422 + `{ errors }`, the Laravel convention, so this
   * endpoint validates itself and answers that way instead of Nest's 400.
   */
  @Post('http/echo')
  async echo(@Body() body: unknown) {
    await sleep(300)
    const parsed = await EchoSchema.safeParseAsync(body)
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) errors[issue.path.map(String).join('.')] ??= issue.message
      throw new UnprocessableEntityException({ message: 'The given data was invalid.', errors })
    }
    return { received: parsed.data, total: parsed.data.amount * 1.21, at: stamp() }
  }
}
