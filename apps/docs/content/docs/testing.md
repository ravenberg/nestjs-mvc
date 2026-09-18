---
title: Testing
---

A page is a controller that returns data, so you can test it like any NestJS route: ask for it the way a browser does, and check which page came back with which props. {% .lead %}

## Start your app in a test

Use the Nest testing module and supertest, the same as for any NestJS app. Import your `AppModule` and start the app once for the whole file:

```ts
// test/app.e2e-spec.ts
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { configureApp } from '../src/app.setup'

let app: INestApplication

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
  app = configureApp(module.createNestApplication())
  await app.init()
})

afterAll(() => app?.close())
```

`main.ts` doesn't run in tests, so anything you set up there is missing, including the validation pipe that sends errors back to your forms. Move that setup into a function that `main.ts` and your tests both call:

```ts
// src/app.setup.ts
export function configureApp<T extends INestApplication>(app: T): T {
  app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
  return app
}
```

While tests run, Vite starts inside your app just like in development. Closing the app in `afterAll` stops it again, so your test runner can exit.

## A browser for your tests

When you click a link, the browser asks for the next page with a normal `GET`, plus two headers. One says "send me the page as data, not HTML", the other says which version of your app the current page came from. A small helper can send those for you, and keep cookies between requests like a browser does:

```ts
// test/browser.ts
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'

export function browser(app: INestApplication) {
  const agent = request.agent(app.getHttpServer())
  let version = ''
  let page = { url: '/', component: '' }

  const headers = () => ({ 'X-Inertia': 'true', 'X-Inertia-Version': version })

  async function visit(url: string, extra: Record<string, string> = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await agent.get(url).set({ ...headers(), ...extra })
      const newer = response.headers['x-inertia-version']
      if (response.status === 409 && newer && newer !== version) {
        version = newer // the server asked for a fresh load: try again, as the browser does
        continue
      }
      if (response.body?.component) {
        version = response.body.version ?? ''
        page = { url, component: response.body.component }
      }
      return response
    }
    throw new Error(`${url} kept asking for a fresh load`)
  }

  function reload(only: string[]) {
    return visit(page.url, {
      'X-Inertia-Partial-Component': page.component,
      'X-Inertia-Partial-Data': only.join(','),
    })
  }

  function submit(method: 'post' | 'put' | 'patch' | 'delete', url: string, data: object = {}, extra: Record<string, string> = {}) {
    return agent[method](url).set({ ...headers(), Referer: page.url, ...extra }).send(data)
  }

  return { agent, visit, reload, submit }
}
```

You don't have to know the version up front. The helper starts without one, and when it doesn't match, the server answers `409` with the right version in a header. The helper tries again with it, which is what the browser does too. After that it takes the version from each page it gets back.

`submit` also sends the page you're on as `Referer`. That's where `back()` and a failed validation send you.

## Check the page and its props

Log in through your own login form, then visit a page. The body is the page: its name in `component` and its data in `props`.

```ts
import { browser } from './browser'

it('shows an invoice', async () => {
  const ada = browser(app)
  await ada.visit('/login')
  await ada.submit('post', '/login', { email: 'ada@example.com', password: 'secret' }).expect(302)

  const page = (await ada.visit('/invoices/42')).body
  expect(page.component).toBe('Invoices/Show')
  expect(page.props.invoice).toMatchObject({ number: 'INV-042', total: 250 })
  expect(page.props.auth.user.name).toBe('Ada')
})
```

Each `browser()` has its own cookies, so two of them are two people. That makes it easy to check that Grace can't open Ada's invoice.

The status code is there too, so an [error page](/docs/error-pages) comes back with its `404` or `403`.

## Data that comes later

A prop wrapped in `defer()` isn't in the first answer. The page lists it under `deferredProps` instead, and the browser asks for it right after. Do the same with `reload`:

```ts
const page = (await ada.visit('/dashboard')).body
expect(page.props.stats).toBeUndefined()
expect(page.deferredProps).toEqual({ default: ['stats'] })

const later = (await ada.reload(['stats'])).body
expect(later.props.stats.orders).toBe(12)
expect(later.props.invoices).toBeUndefined()
```

`reload` asks for the props you name and nothing else, just like `router.reload({ only })` on the page. It works the same for `optional()` props.

## Submit a form

A form gets a redirect back, so the errors aren't in the answer itself. They're on the next page you visit:

```ts
await ada.visit('/invoices/create')

const invalid = await ada.submit('post', '/invoices', { customer: '', total: -5 })
expect(invalid.status).toBe(302)
expect(invalid.headers.location).toBe('/invoices/create')

const form = (await ada.visit('/invoices/create')).body
expect(form.props.errors).toEqual({ customer: 'Pick a customer.', total: 'The total must be positive.' })
```

A form that works redirects wherever your handler says, and a [flash message](/docs/flash-messages) is on the page after it:

```ts
const saved = await ada.submit('post', '/invoices', { customer: 'Acme', total: 250 })
expect(saved.headers.location).toMatch(/^\/invoices\/\d+$/)

const show = (await ada.visit(saved.headers.location)).body
expect(show.flash).toEqual({ message: 'Invoice created.' })
```

Errors and flash messages are for one page only, so check them on the first visit after the form. A `PUT`, `PATCH` or `DELETE` gets a `303` instead of a `302`.

## Live validation

A [live check](/docs/live-validation) is a `POST` to the same route with a `Precognition: true` header, and `Precognition-Validate-Only` naming the fields the user touched. Send it with the agent directly:

```ts
const check = await ada.agent
  .post('/invoices')
  .set({ Precognition: 'true', 'Precognition-Validate-Only': 'total' })
  .send({ total: -5 })

expect(check.status).toBe(422)
expect(check.body.errors).toEqual({ total: 'The total must be positive.' })
```

When the fields are fine, the answer is a `204` with a `Precognition-Success: true` header. Either way your handler doesn't run, so it's worth checking that nothing was saved.

## CSRF

[CSRF protection](/docs/csrf) is off while `NODE_ENV` is `test`, which Jest and Vitest set for you. Your forms work in tests without tokens.

## Replace outside services

Your tests shouldn't charge a card or send an email. Swap the service that talks to the outside world with `overrideProvider`, and keep a handle on the fake so a test can change what it does:

```ts
const payments = {
  failing: false,
  async charge(invoice: { total: number }) {
    if (this.failing) throw new Error('Card declined')
    return { id: 'ch_test' }
  },
}

const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PaymentGateway)
  .useValue(payments)
  .compile()
```

A test can then set `payments.failing = true` to see what the page does when the card is declined. Set it back in a `finally`, because the app is shared by every test in the file.

## Test a controller on its own

A handler that returns props is a plain method that returns an object, so you can call it without starting the app:

```ts
@Get(':id')
@View('Invoices/Show')
async show(@Param('id', ParseIntPipe) id: number) {
  const invoice = await this.invoices.find(id)
  return {
    invoice: { id: invoice.id, number: invoice.number, total: invoice.total },
    payments: defer(() => this.invoices.payments(id)),
  }
}
```

```ts
import { DeferProp } from 'nestjs-mvc'

it('returns the invoice and defers its payments', async () => {
  const invoices = {
    find: async (id: number) => ({ id, number: 'INV-042', total: 250 }),
    payments: async () => [{ amount: 250 }],
  }
  const controller = new InvoicesController(invoices as unknown as InvoicesService)

  const props = await controller.show(42)
  expect(props.invoice).toEqual({ id: 42, number: 'INV-042', total: 250 })
  expect(props.payments).toBeInstanceOf(DeferProp)
  expect(await props.payments.resolve()).toEqual([{ amount: 250 }])
})
```

Every helper (`defer()`, `optional()`, `once()` and the others) has a `resolve()` that runs its function. Handlers that redirect, flash or share data use `ViewService`, which needs a real request, so test those end to end.

## In detail

### Visit before you submit

The version the server hands out also says who the page was rendered for. When someone else is logged in by now, a form sent from that page is refused with a `409`, and the browser loads the page fresh instead. Your handler doesn't run.

In tests that happens when you log in and then submit a form straight away: the helper still has the version of the login page. Visit the form's page first, as a user would.

### Why the helper tries three times

A fresh helper sends no version. If your app sets a `version`, the server first asks for that one. When someone is logged in, it then asks once more for the version of the page as their user sees it. Without a `version` or a login, the first try is enough.

### Forms with an error bag

A form that uses an [error bag](/docs/validation#two-forms-on-one-page) sends the bag's name in an `X-Inertia-Error-Bag` header. Pass it as the last argument of `submit`, and look for the errors one level deeper:

```ts
await ada.visit('/account')
await ada.submit('put', '/account/password', { current: 'wrong' }, { 'X-Inertia-Error-Bag': 'password' })

const account = (await ada.visit('/account')).body
expect(account.props.errors).toEqual({ password: { current: 'That is not your current password.' } })
```

### A full page load

Without the page headers you get the HTML a browser gets when you type the address. Ask for it with `Accept: text/html`, for example to check that a guest is sent to the login page:

```ts
const response = await browser(app).agent.get('/invoices').set('Accept', 'text/html')
expect(response.status).toBe(302)
expect(response.headers.location).toBe('/login')
```

### Testing the CSRF protection itself

To test the check, start a small app with `csrf: true`, the controller you want to check and the providers it needs:

```ts
const module = await Test.createTestingModule({
  imports: [MvcModule.forRoot({ csrf: true })],
  controllers: [ContactController],
}).compile()
```

supertest doesn't send the headers a browser uses to say which site a request comes from, so only the token is checked. A `POST` without it gets a `419`. With it, the request passes: get a page first, then copy the `XSRF-TOKEN` cookie into an `X-XSRF-TOKEN` header, the way the browser code does.

```ts
await request(app.getHttpServer()).post('/contact').send(message).expect(419)

const guest = request.agent(app.getHttpServer())
const page = await guest.get('/contact')
const cookie = page.headers['set-cookie'].find((line: string) => line.startsWith('XSRF-TOKEN='))
const token = decodeURIComponent(cookie.split(';')[0].slice('XSRF-TOKEN='.length))

await guest.post('/contact').set('X-XSRF-TOKEN', token).send(message).expect(302)
```

### Signing keys

Tests don't need an `APP_KEY`. Without one, a random key is used for the run, and unlike in development there's no warning about it.
