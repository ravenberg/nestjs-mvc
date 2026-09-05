import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'

/** Received non-GET requests, newest first; in-memory kitchen-sink state. */
const received: { id: number; method: string; payload: unknown; at: string }[] = []
let nextId = 1

const record = (method: string, payload: unknown) => {
  received.unshift({ id: nextId++, method, payload, at: new Date().toISOString() })
  received.splice(20)
}

const CITIES = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen', 'Maastricht', 'Leiden', 'Delft']

/**
 * Navigation: links & methods, preserve state, preserve scroll, redirects.
 * Everything here is ordinary Nest routing; what the pages demonstrate is what
 * the client does with the responses.
 */
@Controller('features/navigation')
export class NavigationController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  // ── links & methods ──────────────────────────────────────────────────────

  @Get('links')
  @View('Features/Navigation/Links')
  links(@Query('tab') tab?: string) {
    return { tab: tab ?? 'overview', received }
  }

  @Post('links/items')
  create(@Body() body: Record<string, unknown>) {
    record('POST', body)
    return this.view.flash('message', 'POST received; redirected back with 302.').back()
  }

  @Put('links/items/:id')
  replace(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    record('PUT', { id, ...body })
    return this.view.flash('message', 'PUT received; redirected back with 303 so the follow-up is a GET.').back()
  }

  @Patch('links/items/:id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    record('PATCH', { id, ...body })
    return this.view.flash('message', 'PATCH received; 303 back.').back()
  }

  @Delete('links/items/:id')
  remove(@Param('id') id: string) {
    record('DELETE', { id })
    return this.view.flash('message', 'DELETE received; 303 back.').back()
  }

  // ── preserve state ───────────────────────────────────────────────────────

  @Get('preserve-state')
  @View('Features/Navigation/PreserveState')
  preserveState(@Query('tab') tab?: string) {
    const current = ['profile', 'billing', 'team'].includes(tab ?? '') ? tab! : 'profile'
    return { tab: current, renderedAt: new Date().toISOString() }
  }

  // ── preserve scroll ──────────────────────────────────────────────────────

  @Get('preserve-scroll')
  @View('Features/Navigation/PreserveScroll')
  preserveScroll(@Query('highlight') highlight?: string) {
    return {
      highlight: highlight ? Number(highlight) : null,
      cities: Array.from({ length: 40 }, (_, i) => ({ id: i + 1, name: `${CITIES[i % CITIES.length]} ${Math.floor(i / CITIES.length) + 1}` })),
    }
  }

  // ── redirects ────────────────────────────────────────────────────────────

  @Get('redirects')
  @View('Features/Navigation/Redirects')
  redirects(@Query('from') from?: string) {
    return { from: from ?? null }
  }

  @Get('redirects/internal')
  internal() {
    return this.view.flash('message', 'Redirected with 302 to an Inertia page; the client followed it as a visit.').redirect('/features/navigation/redirects?from=internal')
  }

  @Get('redirects/back')
  back() {
    return this.view.flash('message', 'back(): redirected to the Referer.').back()
  }

  @Put('redirects/put')
  afterPut() {
    return this.view.flash('message', 'After a PUT the redirect is 303, so the browser makes a GET.').redirect('/features/navigation/redirects?from=put')
  }

  @Get('redirects/external')
  external() {
    // 409 + X-Inertia-Location during an Inertia visit: the client does a full page load.
    return this.view.location('https://inertiajs.com/docs/v3/core-concepts/the-protocol')
  }
}
