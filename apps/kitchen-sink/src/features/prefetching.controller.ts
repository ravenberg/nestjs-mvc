import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const stamp = () => new Date().toISOString()

const QUOTES = [
  'The monolith is back.',
  'MVC where the V is your frontend framework.',
  'Zero API: the request/response cycle is your state management.',
  'One process, one port, in development and production.',
  'Failures degrade, never crash.',
]

/** In-memory catalogue for the cache-tags page. */
const products: { id: number; name: string; price: number; updatedAt: string }[] = [
  { id: 1, name: 'Keyboard', price: 89, updatedAt: stamp() },
  { id: 2, name: 'Monitor', price: 329, updatedAt: stamp() },
  { id: 3, name: 'Desk lamp', price: 45, updatedAt: stamp() },
]

/**
 * Prefetching: link prefetch, stale-while-revalidate, cache management. The
 * server is deliberately slow (400 ms) and stamps every response, so the page
 * can show whether a visit was served from the client's cache or freshly
 * rendered. Nothing here is cached on the server; the cache is the client's.
 */
@Controller('features/prefetching')
export class PrefetchingController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  // ── link prefetch ────────────────────────────────────────────────────────

  @Get('links')
  @View('Features/Prefetching/Links')
  links() {
    return { renderedAt: stamp() }
  }

  @Get('links/page/:n')
  @View('Features/Prefetching/Page')
  async page(@Param('n') n: string) {
    await sleep(400)
    return { n: Number(n), renderedAt: stamp() }
  }

  // ── stale while revalidate ───────────────────────────────────────────────

  @Get('swr')
  @View('Features/Prefetching/Swr')
  swr() {
    return { renderedAt: stamp() }
  }

  @Get('swr/quote')
  @View('Features/Prefetching/Quote')
  async quote() {
    await sleep(400)
    const i = Math.floor(Date.now() / 1000) % QUOTES.length
    return { quote: QUOTES[i], renderedAt: stamp() }
  }

  // ── cache management (tags) ──────────────────────────────────────────────

  @Get('cache')
  @View('Features/Prefetching/Cache')
  cache() {
    return { renderedAt: stamp() }
  }

  @Get('cache/products')
  @View('Features/Prefetching/Products')
  async list() {
    await sleep(400)
    return { products, renderedAt: stamp() }
  }

  @Get('cache/products/:id')
  @View('Features/Prefetching/Product')
  async show(@Param('id') id: string) {
    await sleep(400)
    const product = products.find((p) => p.id === Number(id))
    return { product: product ?? null, renderedAt: stamp() }
  }

  @Post('cache/products/:id/price')
  reprice(@Param('id') id: string, @Body('delta') delta?: string) {
    const product = products.find((p) => p.id === Number(id))
    if (product) {
      product.price = Math.max(1, product.price + (Number(delta) || 10))
      product.updatedAt = stamp()
    }
    return this.view.flash('message', `${product?.name ?? 'Product'} is now €${product?.price}.`).back()
  }
}
