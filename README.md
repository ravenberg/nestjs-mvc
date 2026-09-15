# nestjs-mvc

## NestJS in MVC mode, where the View is your frontend framework

The NestJS docs have an MVC page. It tells you to install Handlebars and use `@Render()`. This package is the answer to that page: your controllers keep deciding everything, and the view is a React or Vue component tree instead of a template. Pages are delivered over the [Inertia](https://inertiajs.com) protocol, so the app feels like a single-page app while you build it like a monolith.

- **The monolith is back.** NestJS modules are the best modular monolith in TypeScript.
- **The V in MVC** `@View('Contacts/Index')` on a handler, props returned as a plain object, a component on the other side.
- **Zero API.** The request/response cycle is your state management. No endpoints designed for your own frontend, no DTOs typed twice, no cache invalidation choreography. Mutate with a POST, handle failure with an `errors` prop, redirect back, and the page is fresh.

One process, one port, one codebase: `nest start --watch` runs the Vite dev server inside your Nest process, and a single `vite build` produces the production assets. Client-rendered by default; server rendering is one decorator away on the routes that need it.

Below is the whole loop with a small CRM: a contacts list from TypeORM, the page that renders it, and the form that adds a contact.

## Install

```sh
pnpm add nestjs-mvc @inertiajs/react react react-dom
pnpm add -D vite @vitejs/plugin-react
```

Requires NestJS 12, React 19 or Vue 3.5, and Node `^20.19 || ^22.12 || >=24`. `@inertiajs/react` is the client that `nestjs-mvc/react` re-exports; you install it, you never import it.

Using Vue? Install `@inertiajs/vue3 vue` and `@vitejs/plugin-vue` instead, and import from `nestjs-mvc/vue`. The examples below use React; the controllers are the same for both.

## Setup

Three files. The Vite config, the module, and the HTML shell.

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), nestjsMvc()],
})
```

There is no `main.tsx` to write. `nestjsMvc()` generates the client entry from the pages in `frontend/pages/`, links `frontend/app.css` if it exists, and makes `vite build` output both the client and the SSR bundle.

```ts
// src/app.module.ts
import { Module } from '@nestjs/common'
import { MvcModule } from 'nestjs-mvc'
import { template } from './template'

@Module({
  imports: [
    MvcModule.forRoot({
      template,
      // Boots Vite in middleware mode inside this process during development;
      // resolves hashed asset tags from the build manifest in production.
      vite: {},
    }),
  ],
})
export class AppModule {}
```

```ts
// src/template.ts
import type { PageObject, TemplateContext } from 'nestjs-mvc'

export function template(page: PageObject, ctx: TemplateContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CRM</title>
${ctx.assets()}
${ctx.head()}
</head>
<body>${ctx.body()}</body>
</html>`
}
```

The shell is rendered once, on the first request. Every navigation after that is a JSON exchange the client turns into a page. Two lines in `main.ts` complete the setup: a validation pipe whose field errors flow back to your forms, and the built assets in production.

```ts
// src/main.ts
import { StandardSchemaValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { standardSchemaExceptionFactory } from 'nestjs-mvc'
import { join } from 'node:path'
import { AppModule } from './app.module'

const app = await NestFactory.create<NestExpressApplication>(AppModule)
app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))
if (process.env.NODE_ENV === 'production') {
  app.useStaticAssets(join(process.cwd(), 'dist/client'), { prefix: '/build/' })
}
await app.listen(3000)
```

## A page from a controller

A handler with `@View()` returns props. Everything else, from data access to authorization, is plain NestJS.

```ts
// src/contacts/contacts.controller.ts
import { Controller, Get, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { View } from 'nestjs-mvc'
import { ILike, Repository } from 'typeorm'
import { Contact } from './contact.entity'

@Controller('contacts')
export class ContactsController {
  constructor(@InjectRepository(Contact) private readonly contacts: Repository<Contact>) {}

  @Get()
  @View('Contacts/Index')
  async index(@Query('search') search = '') {
    const contacts = await this.contacts.find({
      where: search ? [{ lastName: ILike(`%${search}%`) }, { email: ILike(`%${search}%`) }] : {},
      order: { lastName: 'ASC' },
      take: 50,
    })

    return {
      search,
      contacts: contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email })),
    }
  }
}
```

The returned object is the page's props. On a first visit it is embedded in the HTML shell; on every visit after that it is the JSON response to the client's request.

## Rendering the page

The component lives at `frontend/pages/Contacts/Index.tsx`, the path named in `@View()`. Its props are the object the controller returned.

```tsx
// frontend/pages/Contacts/Index.tsx
import { Head, Link, router, usePage } from 'nestjs-mvc/react'

interface Props {
  search: string
  contacts: { id: number; name: string; email: string | null }[]
}

export default function Index({ search, contacts }: Props) {
  const flash = usePage().flash?.success as string | undefined

  return (
    <>
      <Head title="Contacts" />
      <h1>Contacts</h1>
      {flash && <p className="notice">{flash}</p>}

      <input
        defaultValue={search}
        placeholder="Search"
        onChange={(e) => router.get('/contacts', { search: e.target.value }, { preserveState: true, replace: true })}
      />
      <Link href="/contacts/create">New contact</Link>

      <ul>
        {contacts.map((contact) => (
          <li key={contact.id}>
            <Link href={`/contacts/${contact.id}`}>{contact.name}</Link> {contact.email}
          </li>
        ))}
      </ul>
    </>
  )
}
```

`Link` navigates without a full page load, `router.get()` re-runs the same controller with new query parameters, and `Head` sets the document title. Everything a page needs is imported from `nestjs-mvc/react`.

## Handling a form submission

A POST handler validates, saves, flashes a message and redirects. Validation is a schema on the parameter: when it fails, nestjs-mvc sends the client back to the form with the field errors as the `errors` prop. There is no error response to design and nothing to catch.

```ts
// src/contacts/contacts.controller.ts — the same controller, the mutation side
import { Body, Controller, Get, Post } from '@nestjs/common'
import { View, ViewService } from 'nestjs-mvc'
import { z } from 'zod'

const ContactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  // An empty input is "no email", anything else has to be one.
  email: z.email('That is not an email address.').or(z.literal('')),
})

@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly view: ViewService,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  @Get('create')
  @View('Contacts/Create')
  create() {
    return {}
  }

  @Post()
  async store(@Body({ schema: ContactSchema }) body: z.infer<typeof ContactSchema>) {
    const contact = await this.contacts.save(this.contacts.create({ ...body, email: body.email || null }))
    return this.view.flash('success', `${contact.firstName} was added.`).redirect('/contacts')
  }
}
```

Any Standard Schema library works in `@Body({ schema })` (Zod, Valibot, ArkType). Prefer class-validator DTOs? Use `ValidationPipe` with `validationExceptionFactory` from `nestjs-mvc` instead; the errors reach the form the same way.

Business rules that are not schema rules throw a `ValidationException` from anywhere in the handler:

```ts
import { ValidationException } from 'nestjs-mvc'

if (await this.contacts.existsBy({ email: body.email })) {
  throw new ValidationException({ email: 'A contact with this email already exists.' })
}
```

## The form

`useForm` holds the data, sends it, and receives the errors after the redirect back. The submit is a POST to the handler above; a success is the redirect it returns.

```tsx
// frontend/pages/Contacts/Create.tsx
import { Head, Link, useForm } from 'nestjs-mvc/react'

export default function Create() {
  const form = useForm({ firstName: '', lastName: '', email: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.post('/contacts')
  }

  return (
    <>
      <Head title="New contact" />
      <h1>New contact</h1>

      <form onSubmit={submit}>
        <label>
          First name
          <input value={form.data.firstName} onChange={(e) => form.setData('firstName', e.target.value)} />
          {form.errors.firstName && <span className="error">{form.errors.firstName}</span>}
        </label>

        <label>
          Last name
          <input value={form.data.lastName} onChange={(e) => form.setData('lastName', e.target.value)} />
          {form.errors.lastName && <span className="error">{form.errors.lastName}</span>}
        </label>

        <label>
          Email
          <input value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
          {form.errors.email && <span className="error">{form.errors.email}</span>}
        </label>

        <button type="submit" disabled={form.processing}>
          {form.processing ? 'Saving…' : 'Save'}
        </button>
        <Link href="/contacts">Cancel</Link>
      </form>
    </>
  )
}
```

That is the whole loop. A GET renders a page, a POST changes something and redirects, and the next GET renders the fresh state. Nothing on the client remembers what the server knows better.

## What else is in the box

Everything from the controller side: partial reloads, deferred props (`defer()`), lazy props (`optional()`), merge and prepend for lists, infinite scroll (`scroll()`), once-props, prefetch-aware responses, flash data without sessions, error bags, live validation (Precognition) through the same pipes, history encryption, your own error pages, and opt-in server-side rendering with `@Ssr()` on the routes that need it. Express and Fastify are both supported.

The documentation site is on its way. Until then, the [kitchen sink](https://github.com/ravenberg/nestjs-mvc/tree/main/apps/kitchen-sink) exercises every feature with a page per topic.

nestjs-mvc is a community project and is not affiliated with the NestJS team. MIT licensed.
