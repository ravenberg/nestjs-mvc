---
title: NestJS in MVC mode
description: Introducing nestjs-mvc to the team. The story of one developer, one brief, and one codebase.
---

<!-- .slide: class="center-slide" -->

# NestJS in MVC mode

Controllers return views. The view is your frontend framework.

Note: Open with the one-liner and let it sit. The talk explains each half: "controllers return views" is the server side, "the view is your frontend framework" is the client side. Then we follow one developer through it.

---

<div class="split">
<div>

## Meet Sam

<p>Sam is a good developer. Sam has been asked to build the company's new internal platform: customers, contracts, invoices, roles, an audit trail.</p>
<p>There is no frontend team. There is no backend team. There is Sam.</p>

</div>
<img class="illustration" src="/illustrations/working-late.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: Sam is the audience. Half the room has been Sam, or will be soon. With agentic tooling, "one person owns a feature end to end" is becoming the normal unit of work, whether or not the org chart says so.

---

<div class="split">
<div>

## The brief

<ul>
<li>Authentication, roles, permissions</li>
<li>Forms with real validation</li>
<li>Tables that search, sort and page</li>
<li>Reports that take a few seconds</li>
<li>Still maintainable in two years</li>
</ul>

</div>
<img class="illustration" src="/illustrations/checklist.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: Nothing exotic here. This is the everyday shape of enterprise software, and it is exactly the shape that gets expensive when one person has to build both halves of it.

---

<div class="split">
<div>

## Day one: the docs

<p>Sam knows NestJS, so Sam opens the NestJS docs and finds the MVC page.</p>
<p>It says: install Handlebars and use <code>@Render()</code>.</p>
<p>That was fine for a settings page in 2015. It is not how anyone builds a frontend today.</p>

</div>
<img class="illustration" src="/illustrations/not-found.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: Everyone in the room has scrolled past that page. The point is not that it is wrong. It stops exactly where our work starts.

---

## Day two: the usual answer

Build an API. Build a React app. Put a contract in between.

```text
NestJS  ───── REST or GraphQL ─────▶  React
DTOs                                  the same DTOs, again
guards                                token plumbing
pagination                            useQuery, invalidation
```

Note: Two codebases and one contract, and the contract is where the time goes. Every feature becomes a PR on both sides plus an agreement about the shape in the middle.

---

<div class="split">
<div>

## Every feature, twice

<ul>
<li>A DTO on the server, a type on the client</li>
<li>An endpoint, then a hook that calls it</li>
<li>A loading state, an error state, a cache to invalidate</li>
<li>And Sam is also the contract between the two</li>
</ul>

</div>
<img class="illustration" src="/illustrations/headache.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: This is the API tax. It is invisible in a team of twelve because it is spread over people. For one person it is half the job.

---

<div class="split">
<div>

## Wait

<p>The controller already knows everything: the user, the data, the rules.</p>
<p>What if the controller just returned the page?</p>
<p>What if the V in MVC was React?</p>

</div>
<img class="illustration" src="/illustrations/idea.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: This is classic MVC, not a new architecture. The only thing that changed in the last decade is that templates could not compete with React, so people gave up on MVC in JavaScript. That is the gap nestjs-mvc fills.

---

## Three pillars

1. **The monolith is back.** NestJS modules are the best modular monolith in TypeScript.
2. **MVC with a real V.** `@View()` on a handler, props as a plain object, a component on the other side.
3. **Zero API.** The request and response cycle is the state management.

Note: Say these three slowly. Everything that follows maps back to one of them.

---

<div class="split reverse">
<img class="illustration" src="/illustrations/business-recipe.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
<div>

## In one sentence

<div class="one-liner">A NestJS controller that returns a React page, delivered over the Inertia protocol.</div>

<p>Three things you already have. Nothing new to learn, one new way to combine them.</p>

</div>
</div>

Note: Say the sentence once, then let the next four slides prove it: the controller, the page, and the form on both sides.

---

## The controller

```ts {|1,8-9|10|11-15}
@Controller('contacts')
export class ContactsController {
  constructor(
    @InjectRepository(Contact)
    private readonly contacts: Repository<Contact>,
  ) {}

  @Get()
  @View('Contacts/Index')
  async index(@Query('search') search = '') {
    const contacts = await this.contacts.find({
      where: { lastName: ILike(`%${search}%`) },
      take: 50,
    })
    return { search, contacts }
  }
}
```

Note: Step through with the arrow key: the whole file, then the decorators, then the handler signature, then the query and the return value. Everything else is the NestJS they already write. TypeORM, guards, pipes, dependency injection: unchanged.

---

## The page

```tsx {|1|3|4-5,10|12-14}
import { Head, Link, router } from 'nestjs-mvc/react'

export default function Index({ search, contacts }) {
  const find = (e) =>
    router.get('/contacts', { search: e.target.value })

  return (
    <>
      <Head title="Contacts" />
      <input defaultValue={search} onChange={find} />
      <ul>
        {contacts.map((c) => (
          <li key={c.id}>
            <Link href={`/contacts/${c.id}`}>{c.name}</Link>
          </li>
        ))}
      </ul>
    </>
  )
}
```

Note: The props are exactly what the controller returned. No fetch, no loading state, no typed client. The search box re-runs the same controller with a query parameter, and the list updates without a page load.

---

## A form, server side

```ts {|1-4|5|6-8}
@Post()
async store(
  @Body({ schema: ContactSchema }) body: NewContact,
) {
  await this.contacts.save(this.contacts.create(body))
  return this.view
    .flash('success', 'Contact added.')
    .redirect('/contacts')
}
```

- Invalid input goes back to the form with an `errors` prop
- Nothing to catch, no error response to design

Note: The validation pipe throws, the adapter turns it into a redirect back with the field errors. Laravel people know this flow from Inertia. For everyone else it is simply POST, redirect, GET.

---

## A form, client side

```tsx {|1|3|4-7|8|9}
const form = useForm({ firstName: '', lastName: '' })

<form onSubmit={(e) => { e.preventDefault(); form.post('/contacts') }}>
  <input
    value={form.data.firstName}
    onChange={(e) => form.setData('firstName', e.target.value)}
  />
  {form.errors.firstName && <span>{form.errors.firstName}</span>}
  <button disabled={form.processing}>Save</button>
</form>
```

Note: useForm holds the data, sends it, and receives the errors after the redirect. That is the whole loop. A GET renders, a POST changes something and redirects, and the next GET renders fresh state.

---

<div class="split">
<div>

## What Sam skips

<ul>
<li>Endpoints designed for our own frontend</li>
<li>DTOs typed twice</li>
<li>Loading states, error states, cache invalidation</li>
<li>The contract between two halves that are the same person</li>
</ul>

</div>
<img class="illustration" src="/illustrations/multitasking.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: This is zero API, said from Sam's point of view. One person owns a feature end to end: controller, data, view, mutation. Not because the org chart says so, but because there is nothing in between to hand over.

---

## Under the hood

- First request: an HTML shell with the page object embedded
- Every navigation after that: a JSON exchange, the client swaps the page
- It is the **Inertia protocol**. Not a secret, and not a second thing to learn

Note: Name Inertia openly. Laravel people will recognise the whole model. Others only need to know there is a well-worn protocol underneath, and that nestjs-mvc is the NestJS side of it plus the React client, re-exported from one package.

---

<div class="split">
<div>

## Also in the box

<ul>
<li>Partial reloads, deferred props, infinite scroll</li>
<li>Polling and prefetching</li>
<li>Flash and validation errors, no session</li>
<li>Live validation through the same pipes</li>
<li>Your own error pages, real status codes</li>
<li>Server rendering where you ask: <code>@Ssr()</code></li>
</ul>

</div>
<img class="illustration" src="/illustrations/tools.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: Do not go through these one by one. Say "every one of these has a page in the kitchen sink" and move on. Offer to demo any of them in the questions.

---

<div class="split">
<div>

## One process

<ul>
<li><code>nest start --watch</code> runs Vite inside the Nest process</li>
<li>No second terminal, no second port</li>
<li>One <code>vite build</code> for production</li>
</ul>

</div>
<img class="illustration" src="/illustrations/workspace.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: The developer-experience slide. The demo is the proof: start one thing, open one URL.

---

## Where it sits

<div class="scatter">
<svg viewBox="0 0 800 520" role="img" aria-label="Adoption against momentum">
  <line class="axis" x1="410" y1="30" x2="410" y2="490" />
  <line class="axis" x1="50" y1="260" x2="770" y2="260" />
  <text class="axis-name" x="410" y="18" text-anchor="middle">Momentum</text>
  <text class="axis-name" x="775" y="252" text-anchor="end">Adoption</text>
  <text class="corner" x="64" y="62">Low adoption,</text>
  <text class="corner" x="64" y="90">high momentum</text>
  <text class="corner" x="756" y="62" text-anchor="end">High adoption,</text>
  <text class="corner" x="756" y="90" text-anchor="end">high momentum</text>
  <text class="corner" x="64" y="462">Low adoption,</text>
  <text class="corner" x="64" y="490">low momentum</text>
  <text class="corner" x="756" y="462" text-anchor="end">High adoption,</text>
  <text class="corner" x="756" y="490" text-anchor="end">low momentum</text>
    <circle class="dot purple" cx="634" cy="128" r="9" />
    <text class="label" x="650" y="133">Next.js</text>
    <circle class="dot blue" cx="270" cy="102" r="9" />
    <text class="label" x="286" y="107">TanStack Start</text>
    <circle class="dot purple" cx="494" cy="238" r="9" />
    <text class="label" x="510" y="243">React Router</text>
    <circle class="dot green" cx="564" cy="326" r="9" />
    <text class="label" x="580" y="331">Laravel + Inertia</text>
    <circle class="dot green" cx="522" cy="392" r="9" />
    <text class="label" x="538" y="397">Rails + Hotwire</text>
    <circle class="dot blue" cx="214" cy="225" r="9" />
    <text class="label" x="230" y="230">AdonisJS + Inertia</text>
    <circle class="dot red" cx="130" cy="427" r="9" />
    <text class="label" x="146" y="432">@Render() + Handlebars</text>
    <circle class="dot us" cx="144" cy="163" r="12" />
    <text class="label us" x="164" y="169">NestJS + nestjs-mvc</text>
</svg>
</div>

Note: Adoption against momentum. We sit top left: the momentum is NestJS's, the adoption is not ours yet. This talk is the pitch to move the dot to the right. Pre-empt the AdonisJS question: yes, it has an official adapter and is closer to Laravel. The honest answer is adoption. We run NestJS, the jobs are NestJS, and this gives NestJS the same story.

---

## Status

- Server adapter, Vite plugin and client in one package: `nestjs-mvc`
- 228 tests on the adapter, 77 Playwright tests on the kitchen sink
- Docs site in progress, the kitchen sink covers every feature today
- Express and Fastify

Note: Update the numbers before presenting. Mention the npm publish once it is out.

---

<div class="split">
<div>

## Demo

<ol>
<li>Start the app, open the URL</li>
<li>A list page from a controller</li>
<li>Add a record: validation errors, then success</li>
<li>Deferred props and a partial reload in the Network tab</li>
</ol>

</div>
<img class="illustration" src="/illustrations/having-lunch.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: Keep the demo to four steps and under ten minutes. Have the kitchen sink running before the talk starts.

---

<div class="split">
<div>

## Sam, six months later

<p>The platform shipped. One codebase, one process, one person who understood all of it.</p>
<p>When the second developer joined, there was one thing to read.</p>

</div>
<img class="illustration" src="/illustrations/accomplishment.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">
</div>

Note: Close the story before the questions. The point is not that teams are bad. The point is that the stack no longer forces a team-shaped split onto a feature-shaped job.

---

<!-- .slide: class="center-slide" -->

<img class="illustration small" src="/illustrations/public-speaking.svg" alt="" onerror="this.parentElement.classList.add('no-image'); this.remove()">

# Questions?

github.com/ravenberg/nestjs-mvc

Note: Likely questions: authentication (guards, unchanged), testing (supertest against controllers, Playwright against pages), mobile clients (build a real API for them, this is for our own web frontend), and Vue or Svelte (planned, same adapter).
