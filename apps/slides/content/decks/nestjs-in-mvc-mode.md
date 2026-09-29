---
title: NestJS in MVC mode
description: Three acts. Why we split the stack in two, what MVC with a real View looks like, and how nestjs-mvc puts the two halves back together.
---

<!-- .slide: class="center-slide" -->

# NestJS in MVC mode

<div class="one-liner">The view is your frontend framework.</div>

Note: Open cold. Say the one-liner out loud, then let it sit for a beat. Then set up the shape of the talk: three acts. The why: how we ended up with a frontend and a backend as two separate things, and what that cost us. The what: the old pattern that solved this, and the gap that is still in it. The how: the code, the features, a demo. Questions at the end. Roughly forty minutes, then the floor is theirs.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">Act I</p>

# The why

Note: A short history lesson, not out of nostalgia. It is here to make one point: the split between frontend and backend was a choice. A deliberate one, made for good reasons. And every choice has a price we rarely add up. Quick show of hands: who has worked on a server-rendered app with a bit of jQuery on top? And who has built a React app against a REST API? That is the journey we are tracing.

---

<div class="split">
<div>

## 2005: the page was the app

<ul>
<li>The server renders HTML</li>
<li>A form is a POST</li>
<li>JavaScript for the sprinkles</li>
<li>Rails, Django, PHP</li>
</ul>

</div>
<figure class="slot" data-image="act1-page-is-the-app.png">
<img class="illustration" src="/illustrations/act1-page-is-the-app.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: The server renders HTML: every click is a round trip, the server builds the whole page, the browser paints it. Simple mental model: request in, HTML out.

A form is a POST: no fetch, no JSON, no state. The browser does the submit, the server validates, redirects, done.

JavaScript for the sprinkles: jQuery arrives in 2006. A datepicker, an accordion, a bit of Ajax to avoid a full reload. Nobody called it a frontend. It was decoration on a server-owned page.

Rails, Django, PHP: Rails is 2004, Django 2005, Symfony 2005, Laravel later in 2011. One framework, one language, one repo, and it shipped the whole app. Keep that phrase, it comes back.

---

<div class="split">
<div>

## 2007: the phone raised the bar

<ul>
<li>Instant, animated, offline</li>
<li>No white flash between screens</li>
<li>Users learned what an app feels like</li>
<li>The web looked old overnight</li>
</ul>

</div>
<figure class="slot" data-image="act1-native-apps.png">
<img class="illustration" src="/illustrations/act1-native-apps.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Instant, animated, offline: the iPhone in 2007, the App Store in 2008. Native apps kept their state, transitioned between screens, worked on a bad connection.

No white flash: the thing everyone noticed. Tap, and the screen slides. On the web: click, white page, wait, paint.

Users learned what an app feels like: expectations moved. A web product that reloaded on every click suddenly felt like a document, not a product.

The web looked old overnight: and we, the people building for the web, wanted that native feel. That is the motive for everything that follows. It was a good motive.

---

<div class="split">
<div>

## So we split the stack

<ul>
<li>Backbone, Angular, React</li>
<li>JSON in, DOM out</li>
<li>The backend becomes an API</li>
<li>Two codebases, two teams</li>
</ul>

</div>
<figure class="slot" data-image="act1-the-split.png">
<img class="illustration" src="/illustrations/act1-the-split.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Backbone in 2010, AngularJS in 2010, React in 2013, Vue in 2014. The UI moves into the browser, where it can keep state and transition like a native app.

JSON in, DOM out: the browser becomes the rendering engine. The server no longer renders anything, it answers questions in JSON. Mobile apps needed that same API anyway, which made the case even easier.

The backend becomes an API: REST, later GraphQL in 2015. The server's job is reduced to data and rules. Templates go in the bin.

Two codebases, two teams: and because the two halves are different technologies with different deploy cycles, we split the people too. Say this clearly: this was a conscious, defensible decision. Nobody was stupid. We wanted a rich, app-like experience and this was the way to get it in 2012.

---

<div class="split">
<div>

## And it worked

<ul>
<li>Rich, app-like interfaces</li>
<li>Components: a real UI model</li>
<li>An enormous ecosystem</li>
<li>Frontend became a craft</li>
</ul>

</div>
<figure class="slot" data-image="act1-what-we-got.png">
<img class="illustration" src="/illustrations/act1-what-we-got.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Be generous here, this is the audience's craft. Rich interfaces: we got the native feel. Gmail, Figma, Linear, Notion. None of those are possible with a template per click.

Components: the component model is the best thing that happened to UI development. Composition, props, state, a tree. We are not giving that up, and that matters for the rest of the talk.

An enormous ecosystem: design systems, testing tools, bundlers, a job market.

Frontend became a craft: a discipline with its own depth. Everyone in this room owes part of their career to this move. Then the turn: but we traded something for it. Several things, actually. Let's count them.

---

<!-- .slide: class="center-slide" -->

<div class="one-liner">Every trade has two sides.</div>

Note: Seven things follow. Keep the pace up, about a minute each. The order builds towards the one that matters most today, which is the last one.

---

<div class="split">
<div>

## One deployment became two

<ul>
<li>Two pipelines, two artifacts</li>
<li>Deploy order matters</li>
<li>Old tabs, new API</li>
<li>Feature flags, twice</li>
</ul>

</div>
<figure class="slot" data-image="act1-two-deployments.png">
<img class="illustration" src="/illustrations/act1-two-deployments.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Two pipelines: the SPA goes to a CDN, the API goes to servers. Two CI configs, two sets of environment variables, two preview environments per pull request.

Deploy order matters: the API has to go first, and it has to stay backwards compatible with the frontend that is still out there. You are now versioning an API whose only consumer is yourself.

Old tabs, new API: a user who opened the app yesterday still runs yesterday's JavaScript against today's API. Every team learns this the hard way once.

Feature flags, twice: a flag on the server and the same flag on the client, and they had better agree. With a monolith there was one artifact, one version, one deploy. That was not a limitation, it was a feature.

---

<div class="split">
<div>

## The monorepo became an achievement

<ul>
<li>Turborepo, Nx, workspaces</li>
<li>A <code>shared-types</code> package</li>
<li>Codegen from OpenAPI</li>
<li>We had this. It was called a monolith</li>
</ul>

</div>
<figure class="slot" data-image="act1-monorepo.png">
<img class="illustration" src="/illustrations/act1-monorepo.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Turborepo, Nx, workspaces: whole tools, whole conference talks, about getting two codebases to live in one repo and build in the right order. Remote caching. Task graphs.

A shared-types package: the classic first package in every monorepo. Its only purpose is to let the frontend know what the backend returns.

Codegen from OpenAPI: or we generate a client from a spec, and add a build step that breaks when someone forgets to run it.

We had this: in a monolith, the shared type is an import. The build order is the compiler. The monorepo is a clever solution to a problem we created ourselves.

---

<div class="split">
<div>

## Batteries not included

<ul>
<li>Rails, Laravel, Django: auth, ORM, mail, jobs, sockets</li>
<li>The SPA stack: a shopping list</li>
<li>Next, Nuxt: rendering plus route handlers</li>
<li>The rest is your problem</li>
</ul>

</div>
<figure class="slot" data-image="act1-batteries.png">
<img class="illustration" src="/illustrations/act1-batteries.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: The heavyweight frameworks shipped everything an application needs: authentication, an ORM with migrations, mail, background jobs, websockets, validation, sessions, CSRF, a scheduler. Laravel calls it batteries included, Rails calls it omakase. You start with a working application and add your domain.

The SPA stack is a shopping list: pick an auth provider, pick an ORM, pick a job runner, pick an email service, pick a websocket service, pick a validation library, and make them agree with each other. Every project, again.

Next and Nuxt: brilliant at rendering, and they give you route handlers or server actions. That is where they stop.

The rest is your problem: no dependency injection, no modules, no queues, no mailer, no guards. Not wrong, they never claimed to be an application framework. But we lost the thing that made a single developer productive: an opinion about the whole app.

---

<div class="split">
<div>

## The contract tax

<ul>
<li>Every DTO, twice</li>
<li>Validation, twice</li>
<li>Loading, error, empty. Every fetch</li>
<li>Cache invalidation</li>
<li>The server already knew</li>
</ul>

</div>
<figure class="slot" data-image="act1-contract.png">
<img class="illustration" src="/illustrations/act1-contract.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Every DTO twice: a type on the server, a type on the client, and a conversation about the shape in between. Pagination envelopes. Error formats. Which HTTP status for a validation failure.

Validation twice: the rules live on the server, and then we copy them to the client for a nice form, and then they drift.

Loading, error, empty: every single fetch needs three extra states, and a spinner, and a retry. Multiply by the number of screens.

Cache invalidation: react-query keys, stale times, refetch on focus, optimistic rollbacks. An entire discipline about keeping a copy of the server's data in sync with the server.

The server already knew: this is the line. When the server answered that request, it had the user, the permissions, the data and the rules, all in one place. Then we threw that away and rebuilt it in the browser.

---

<div class="split">
<div>

## Team dynamics

<ul>
<li>One feature, two backlogs</li>
<li>Waiting for the endpoint</li>
<li>Mocks that drift</li>
<li>Full stack? Ask permission first</li>
</ul>

</div>
<figure class="slot" data-image="act1-teams.png">
<img class="illustration" src="/illustrations/act1-teams.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: One feature, two backlogs: a feature is now two tickets, two sprint plannings, two reviewers, one meeting to agree on the contract. The feature itself did not get bigger.

Waiting for the endpoint: the frontend is ready and cannot ship. So it mocks the API.

Mocks that drift: and the mock is what you tested against. Integration day is where the sprint goes to die.

Ask permission first: this one is personal for a lot of people. A frontend developer who wants to add a field to the response has to open a ticket on another team's board. Not because the work is hard, but because the architecture drew a wall there and the org chart grew around it. We built a split system and then hired a split organisation to match. Conway's law, in reverse.

---

<div class="split">
<div>

## And now: agent context

<ul>
<li>An agent sees one repo</li>
<li>The contract lives in a Slack thread</li>
<li>Half a feature per prompt</li>
<li>You are the integration layer again</li>
</ul>

</div>
<figure class="slot" data-image="act1-agent-context.png">
<img class="illustration" src="/illustrations/act1-agent-context.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: This is the trade-off that did not exist two years ago, and the reason this talk exists now. Slow down here.

An agent sees one repo: a coding agent works in a working tree. It reads the controller, it reads the test, it edits both. Its whole world is what is on disk.

The contract lives in a Slack thread: in a split stack the agreement between the two halves lives in a spec, a thread, or someone's head. The agent on the API side cannot see the consumer. The agent on the frontend side cannot see what the endpoint really returns. Both are working half blind.

Half a feature per prompt: so you prompt twice, in two repos, and reconcile the result yourself.

You are the integration layer again: the expensive, slow, human integration layer, exactly the part we hoped the agent would take off our hands. In a monolith, one prompt is one feature: the migration, the controller, the page and the test, in one diff, in one context window. The architecture decides how much an agent can do for you.

---

<div class="split">
<div>

## We even brought the server back

<ul>
<li>SSR, server components, server actions</li>
<li>Loaders and actions</li>
<li>Ten years removing the server, five putting it back</li>
<li>A server, but not a backend</li>
</ul>

</div>
<figure class="slot" data-image="act1-pendulum.png">
<img class="illustration" src="/illustrations/act1-pendulum.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: SSR, server components, server actions: Next.js, from 2016 on, put rendering back on the server. Then React Server Components, then server actions: a function on the server, called from a form. Sound familiar? It is a POST to a controller.

Loaders and actions: Remix said it out loud. A loader is a GET handler, an action is a POST handler, the page gets the loader's data as props. That is MVC with the names changed.

Ten years removing the server, five putting it back: the industry has already concluded the pendulum swung too far. The frontend world is rediscovering the request-response cycle, from the frontend side.

A server, but not a backend: and that is the catch. You get a server with your React app, but not a backend framework. No modules, no injection, no queues, no guards. Which brings us to the second act.

---

<!-- .slide: class="center-slide" -->

<div class="one-liner">We didn't choose wrong. We chose for 2012.</div>

Note: Close the act on this. The reasons were valid. Templates could not give us the native feel, so we moved the view to the browser and paid the price in deployment, tooling, contracts, teams, and now agent context. The question for the rest of the talk is whether we still have to pay it. Spoiler: no.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">Act II</p>

# The what

Note: Act two is the pattern. A bit of education, then a personal story, then a hypothesis. Tell them the reveal is at the end of this act.

---

## MVC

<div class="mvc">
<div class="box m">Model<small>knows</small></div>
<span class="arrow">←</span>
<div class="box c">Controller<small>decides</small></div>
<span class="arrow">→</span>
<div class="box v">View<small>shows</small></div>
</div>

<ul>
<li>1979, Smalltalk</li>
<li>Request in, response out</li>
<li>The view is whatever renders</li>
</ul>

Note: 1979, Smalltalk: Trygve Reenskaug at Xerox PARC. Older than most of us. The idea: separate what the app knows, from what it decides, from what it shows.

Request in, response out: on the web it became a pipeline. A request hits a controller. The controller talks to the model, that is your data and your rules. It hands a result to a view. The view becomes the response.

The view is whatever renders: this is the part to underline, because the rest of the talk hangs on it. The pattern does not say the view has to be a template. It says the view shows what the controller decided. Remember that when we get to the hypothesis.

---

## Every big framework shipped a V

| Framework | Language | The V |
| --- | --- | --- |
| Rails | Ruby | ERB |
| Django | Python | Django templates |
| Laravel | PHP | Blade |
| Symfony | PHP | Twig |
| ASP.NET MVC | C# | Razor |
| Spring MVC | Java | Thymeleaf |

Note: Read a few rows, not all. Every heavyweight framework came with its own templating language for the V. The view was server-owned and the framework owned the whole triangle.

That is what batteries included meant in practice: model, view and controller in one box, with authentication, mail and jobs around it. One developer could build a complete product because the framework had an opinion about all three letters.

And every one of these V's hit the same wall in 2010: a template renders a page, and a page is not an app. That is the wall we jumped over by splitting the stack.

---

<div class="split">
<div>

## Meanwhile, I was learning NestJS

<ul>
<li>Modules, dependency injection</li>
<li>Guards, pipes, interceptors</li>
<li>A real backend framework, in TypeScript</li>
<li>Then I found the MVC page</li>
</ul>

</div>
<figure class="slot" data-image="act2-learning-nestjs.png">
<img class="illustration" src="/illustrations/act2-learning-nestjs.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Personal story, keep it light. I come from the frontend side and I wanted a backend I could take seriously in the language I already write.

Modules and dependency injection: NestJS, 2017, Kamil Myśliwiec. It looks like Angular on the server, on purpose. Modules that own their providers, injection everywhere, testable by design.

Guards, pipes, interceptors: a real request pipeline. Authentication in a guard, validation in a pipe, cross-cutting concerns in an interceptor. This is the Laravel and Rails level of ambition, in TypeScript.

A real backend framework: this is the point. NestJS is not a rendering layer with a server bolted on. It is the other way round. It is a backend framework that happens to serve HTTP.

Then I found the MVC page: in the docs, under Techniques, there is a page called MVC. I got excited. Then I read it.

---

<div class="split">
<div>

## The MVC page

```ts
app.setViewEngine('hbs')

@Get()
@Render('index')
root() {
  return { message: 'Hello world!' }
}
```

<ul>
<li>Handlebars and <code>@Render()</code></li>
<li>Technically MVC</li>
</ul>

</div>
<figure class="slot" data-image="act2-mvc-docs-page.png">
<img class="illustration" src="/illustrations/act2-mvc-docs-page.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Handlebars and Render: the whole page says install Handlebars, point Nest at a views folder, put Render on a handler, return an object, and the template gets it. That's it.

Technically MVC: it is. Controller decides, template shows. The object you return is the view's context. And it stops right there, at the same wall the 2005 frameworks hit: a template is a page, and a page is not an app. Every one of us has scrolled past that page thinking: nice, but not for me.

---

<div class="columns">
<div>

### NestJS

<ul>
<li>Modules, DI</li>
<li>Guards, pipes, interceptors</li>
<li>Config, queues, scheduling</li>
<li>WebSockets, microservices</li>
<li>GraphQL, OpenAPI, CQRS</li>
<li>Testing utilities, a CLI</li>
</ul>

</div>
<div>

### Next, Nuxt

<ul>
<li>Rendering, routing</li>
<li>Route handlers, server actions</li>
<li>Middleware</li>
<li>Deploy target: usually one</li>
<li>Everything else: pick a vendor</li>
</ul>

</div>
</div>

Note: Respect where it is due, on both sides. This slide is not to bash Next or Nuxt. They are excellent at what they do. The point is what they are.

Left column: NestJS is an application framework. It has an opinion about how your app is structured, how dependencies flow, how requests are validated, how work is queued, how it is tested. It has been that for eight years, with a big ecosystem.

Right column: Next and Nuxt are rendering frameworks with a server. They give you routing, rendering strategies, and a way to run a function on the server. Then they hand you a shopping list: auth from a vendor, database from a vendor, jobs from a vendor, email from a vendor.

Both are fine. But if the question is "which of these lets one developer build a whole product", the answer is on the left. What the left lacks is a modern V. That gap is the whole opportunity.

---

<div class="split">
<div>

## Handlebars is fine, but

<ul>
<li>Search as you type</li>
<li>Drag and drop</li>
<li>Inline editing</li>
<li>Validate while typing</li>
<li>Infinite feeds</li>
<li>Live dashboards</li>
<li>Optimistic actions</li>
<li>Wizards that remember</li>
</ul>

</div>
<figure class="slot" data-image="act2-rich-experiences.png">
<img class="illustration" src="/illustrations/act2-rich-experiences.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: I am not here to bash Handlebars. For a settings page or an admin list it is perfectly fine. But look at what our users actually expect, and what our products actually are.

Search as you type: Linear, the Algolia box in any docs site. The list filters on every keystroke.

Drag and drop: Trello, Jira boards. Pick up a card, the column reorders under your cursor.

Inline editing: Notion, Airtable. Click a cell, type, it saves. No edit page.

Validate while typing: "that username is taken" before you press submit.

Infinite feeds: any social timeline. Scroll, more arrives, the position stays.

Live dashboards: a deploy status, a queue length, updating while you look at it.

Optimistic actions: archive in Gmail, a like button. The UI answers before the server does.

Wizards that remember: a checkout or an onboarding where step three still knows what you typed in step one, even after the back button.

Every one of these needs state in the browser and partial updates from the server. A template that re-renders the whole page on every click is 2005 again. That is the need Handlebars cannot meet, and it is exactly the need that pushed us into the split in the first place.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">The hypothesis</p>

<div class="one-liner">What if the V in MVC was your frontend framework?</div>

Note: Pause before this one. Put the two things next to each other: a backend framework with a weak V, and a frontend framework that is the best V ever built, with no backend. What if we simply plug the one into the other?

Keep the M and the C exactly as they are in NestJS. Replace the template with a component tree. The controller returns props instead of a template context. The component renders them. Links and forms talk to controllers. No API in between, because there is nothing in between.

Then ask the room: does that sound too simple? Because it is not a new architecture. It is MVC, with the V we actually want.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">The reveal</p>

# It works.

<p>NestJS controllers return React or Vue pages.<br>It feels like a single-page app. You build it like a monolith.</p>

<figure class="slot small" data-image="act2-reveal.png">
<img class="illustration small" src="/illustrations/act2-reveal.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>

Note: The reveal. Say it plainly: I built it, it is called nestjs-mvc, it is on npm, and this docs site and the slides you are looking at run on it.

Then the three claims, slowly. A NestJS controller returns a page: a React or Vue component, with the object the controller returned as its props. It feels like a single-page app: after the first visit, every link and every form is a JSON exchange and the page swaps in place, layout intact. You build it like a monolith: one repo, one process, one deploy, one language, one context window.

Then: let me show you what that looks like.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">Act III</p>

# The how

Note: Act three is code, and it follows the Getting started section of the docs almost one to one. Install, a first page, links, layouts, forms, and then how it works under the hood. Then the rich experiences from act two, revisited. Then the batteries. Then credit where it is due, the demo, and where to find it.

---

## Install

```sh
npm install nestjs-mvc @inertiajs/react react react-dom
npm install -D vite @vitejs/plugin-react
```

```ts {|2|6}
// vite.config.ts
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), nestjsMvc()],
})
```

Note: Two commands in an existing NestJS project. Vue works the same with the Vue packages, everything in this act is React because that is what most of you write.

Step through the Vite config: a standard React plugin, then the nestjs-mvc plugin. That plugin generates the client entry for you from the pages in frontend/pages. There is no main.tsx to write, no createRoot, no router config. It also picks up frontend/app.css if it exists and makes vite build produce the client and the SSR bundle in one go.

---

## Register the module

```ts {|6}
// src/app.module.ts
import { Module } from '@nestjs/common'
import { MvcModule } from 'nestjs-mvc'

@Module({
  imports: [MvcModule.forRoot({ vite: {} })],
})
export class AppModule {}
```

```ts {|3}
// src/main.ts
const app = await NestFactory.create(AppModule)
app.useGlobalPipes(new ValidationPipe({ exceptionFactory: validationExceptionFactory }))
await app.listen(3000)
```

Note: One module import. With vite: {} the Vite dev server runs inside your Nest process while you develop, same port, hot reload included. You start one command, npm run start:dev, and open one URL. In production the same option serves the built files.

Second block: the validation pipe you probably already have, with one exception factory from nestjs-mvc. That factory is what turns a failed DTO into errors on the form, which you will see in a few slides. Zod or any Standard Schema library works too.

That is the whole setup. Vite config, module, pipe. Now a page.

---

## Your first page

<div class="pair">

```ts {|7|9}
// src/app.controller.ts
import { View } from 'nestjs-mvc'

@Controller()
export class AppController {
  @Get()
  @View('Home')
  home() {
    return { name: 'Ada' }
  }
}
```

```tsx {|2|4|5}
// frontend/pages/Home.tsx
type Props = { name: string }

export default function Home({ name }: Props) {
  return <h1>Hello, {name}</h1>
}
```

</div>

Note: Left is the controller, right is the page. Step through them together.

@View('Home') on a handler: this handler renders the page called Home, which is frontend/pages/Home.tsx. Folders work, so Users/Show is frontend/pages/Users/Show.tsx, and most apps end up with a folder per controller.

The return value is a plain object. That object becomes the props of the component. On the right: a normal React component. No fetch, no hook, no loading state, no client, no types written twice. The props are what the controller returned.

Say the sentence from the docs: the object your controller returns becomes the props of the component, and that is really the whole idea. Everything after this is refinement.

---

## It is still NestJS

```ts {|3|7|8|9}
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  @View('Users/Show')
  async show(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findOne(id)
    return { user: { id: user.id, name: user.name } }
  }
}
```

Note: Step through. A service injected in the constructor, like always. A route param with a pipe, like always. A guard on this controller would work like always: an UnauthorizedException on a page becomes a redirect to your login page, and after logging in the user comes back to where they were going.

Last line: pick the fields you send. Everything you return ends up in the browser, so do not return a whole entity with a password hash in it. Same discipline as designing an API response, except you do it once, at the one place that renders this page.

For the NestJS people in the room: nothing changed. For the React people: this is the entire backend you need to learn to render a page. A decorator and a return value.

---

## Links

```tsx {|1|4-5|9|10}
import { Link, router } from 'nestjs-mvc/react'

export default function Index({ users, search }) {
  const find = (e) =>
    router.get('/users', { search: e.target.value }, { preserveState: true })

  return (
    <>
      <input defaultValue={search} onChange={find} />
      {users.map((u) => <Link key={u.id} href={`/users/${u.id}`}>{u.name}</Link>)}
    </>
  )
}
```

Note: Everything a page needs comes from one import, nestjs-mvc/react. Link renders a normal anchor. When someone clicks it, the browser asks the controller for just the data and swaps the page in place. The URL updates, the back button works, the layout stays.

router.get is the same thing from code: a search box that re-runs the same controller with a query parameter. preserveState keeps what the user typed in the input while the list updates. This is the search-as-you-type from act two, and it is one line. If only the list depends on the search, you can ask for only that prop. That is a partial reload, and it comes later.

A link can also POST or DELETE, rendered as a button. Log out is a Link with method post.

---

## Layouts and titles

```tsx {|1-2|4-6|8-10}
import { Head } from 'nestjs-mvc/react'
import { AppLayout } from '../../layouts/AppLayout'

export default function Index({ users }) {
  return <><Head title="Users" /><h1>Users</h1></>
}

Index.layout = (page) => (
  <AppLayout>{page}</AppLayout>
)
```

Note: Head sets the document title, or any tags in the head. A layout is an ordinary component with a nav and a main. You attach it to a page with one static property.

The part that matters: the layout is not rebuilt on every visit. It stays mounted while you move between pages, so an open menu stays open and a playing video keeps playing. That is the single-page-app feel, and it is where a template-per-request could never go. Nested layouts work the same way, from the outside in.

---

## Forms, server side

```ts {|1-4|10-11|13-16}
export class CreateUserDto {
  @IsNotEmpty({ message: 'Please enter a name.' }) name: string
  @IsEmail({}, { message: 'That is not an email address.' }) email: string
}

@Controller('users')
export class UsersController {
  constructor(private users: UsersService, private view: ViewService) {}

  @Get('create')
  @View('Users/Create')
  create() { return {} }

  @Post()
  async store(@Body() dto: CreateUserDto) {
    await this.users.create(dto)
    return this.view.redirect('/users')
  }
}
```

Note: Step through. A DTO with class-validator rules, exactly what you would write for an API. A GET that renders the empty form. A POST that saves and redirects.

Then point at what is not there: no code for when validation fails. The pipe throws, nestjs-mvc sends the user back to the form with the field errors attached. No error response to design, no status code debate, nothing to catch. Rules that need the database, like "this email is taken", throw a ValidationException from anywhere in the handler and arrive at the form the same way.

This is the Laravel flow, and if you have not seen it before it feels like cheating. POST, redirect, GET.

---

## Forms, client side

```tsx {|4|5|9-12|13|14}
import { useForm } from 'nestjs-mvc/react'

export default function Create() {
  const form = useForm({ name: '', email: '' })
  const submit = (e) => { e.preventDefault(); form.post('/users') }

  return (
    <form onSubmit={submit}>
      <input
        value={form.data.name}
        onChange={(e) => form.setData('name', e.target.value)}
      />
      {form.errors.name && <p>{form.errors.name}</p>}
      <button disabled={form.processing}>Save</button>
    </form>
  )
}
```

Note: useForm holds the data. form.post sends it as a real POST to the handler on the previous slide. The input is a controlled input, nothing new. form.errors fills up after the redirect back, one message per field. form.processing is true while the request runs, so the button disables itself.

That is the whole loop: a GET renders a page, a POST changes something and redirects, the next GET renders fresh state. Nothing on the client remembers what the server knows better. No mutation hook, no cache to invalidate, no error state to design.

---

## Flash messages

```ts {|3}
@Post()
async store(@Body() dto: CreateUserDto) {
  const user = await this.users.create(dto)
  return this.view.flash('message', `${user.name} was added.`).redirect('/users')
}
```

```tsx {|2|4}
export default function Index() {
  const { flash } = usePage()

  return <>{flash?.message && <p className="notice">{String(flash.message)}</p>}</>
}
```

Note: Flash before you redirect, read it on the page you land on. It shows once and is gone on the next visit or a refresh, which is exactly what you want from "Saved".

The detail worth one sentence: there is no session store. Flash messages and form errors travel in a signed cookie, so one Nest process serves every user without keeping anything between requests and one user's data can never leak into another's page. Put the notice in your layout once and every page has it.

---

## How it works

```json {|2|3|4|5}
{
  "component": "Users/Show",
  "props": { "user": { "id": 1, "name": "Ada" } },
  "url": "/users/1",
  "version": "a1b2c3"
}
```

<ul>
<li>First visit: HTML with the props inside</li>
<li>Every visit after: this JSON</li>
<li>The page swaps, the layout stays</li>
</ul>

Note: First visit: the browser asks for a URL, the controller runs, and nestjs-mvc sends a full HTML page: your scripts, the page name and the props as JSON in a script tag, and an empty element. The client reads it and renders the component.

Every visit after: a Link sends the same request with one extra header that says "only the data, please". The same controller runs, the answer is this JSON. Step through it: which component, its props, the URL for the address bar, and a version.

The version is the deploy story from act one, solved: after a deploy, a tab on the old version asks for data, the server sees the old version and tells it to do one full reload. Old tabs, new API, handled.

The browser swaps the page and keeps the layout. You can watch all of this in the Network tab, and we will in the demo.

---

## Rich experiences, revisited

| From act II | In nestjs-mvc |
| --- | --- |
| Search as you type | `router.get(url, data, { only: ['results'] })` |
| Validate while typing | `form.validate('email')` |
| Infinite feeds | `scroll()` and `<InfiniteScroll>` |
| Live dashboards | `usePoll(5000, { only: ['queue'] })` |
| Optimistic actions | `router.optimistic(...)` |
| Slow widgets | `defer()` and `<Deferred>` |
| Instant navigation | `<Link prefetch>` |
| Wizards that remember | `useRemember()` |

Note: This is the list from act two, and the answer to "but can it do the rich stuff". Every row is a page in the docs. Pick three to say out loud.

Search as you type with only: the controller runs, but only the results prop is computed and sent. A prop can be a function, and a function that nobody asked for never runs its query.

Validate while typing: form.validate on blur sends the field to the same pipe with the same DTO. The rules stay on the server, the user sees the error before submitting.

Polling: usePoll every five seconds, only the queue prop. Optimistic: change the props on the client first, send the PATCH, the server's answer confirms or rolls back. Deferred: the page shows, the slow stats arrive a moment later with a fallback. Prefetch: the page loads on hover so the click is instant.

None of this needed a second codebase.

---

## One of them, in full

```ts {|1-5|7-15}
@Patch(':id')
async move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveTicketDto) {
  await this.tickets.move(id, dto.status)
  return this.view.back()
}

// frontend/pages/Tickets/Board.tsx
function move(ticket, status) {
  router
    .optimistic((props) => ({
      tickets: props.tickets.map((t) => (t.id === ticket.id ? { ...t, status } : t)),
    }))
    .patch(`/tickets/${ticket.id}`, { status })
}
```

Note: The drag-and-drop board from act two, the whole thing. Server: a PATCH that moves the ticket and sends the browser back to the page it came from. Four lines, and it is a normal NestJS handler with a normal DTO.

Client: before the request goes out, rewrite the props so the card is already in its new column. Then send the PATCH. When the server answers, the fresh props replace the optimistic ones. If the server refuses, say a closed ticket stays closed, the props roll back and the error arrives like any form error.

No cache key, no mutation hook, no reducer. The page is the state.

---

## Batteries included

<div class="cloud">
<span class="s4">Pages from controllers</span>
<span class="s2">Links</span>
<span class="s2">Layouts</span>
<span class="s3">Forms</span>
<span class="s3">Validation</span>
<span class="s2">Live validation</span>
<span class="s2">Flash messages</span>
<span class="s2">Redirects</span>
<span class="s2">File uploads</span>
<span class="s3">Partial reloads</span>
<span class="s2">Deferred props</span>
<span class="s1">Optional props</span>
<span class="s1">Once props</span>
<span class="s1">Merge and prepend</span>
<span class="s2">Infinite scroll</span>
<span class="s2">Polling</span>
<span class="s2">Prefetching</span>
<span class="s3">Optimistic updates</span>
<span class="s2">Shared data</span>
<span class="s1">Remembering state</span>
<span class="s3">Authentication</span>
<span class="s2">Authorization</span>
<span class="s2">CSRF</span>
<span class="s2">Signed links</span>
<span class="s1">History encryption</span>
<span class="s1">CSP nonces</span>
<span class="s2">Error pages</span>
<span class="s3">Server rendering</span>
<span class="s1">Version skew</span>
<span class="s2">Testing</span>
<span class="s2">TypeScript</span>
<span class="s1">Express</span>
<span class="s1">Fastify</span>
<span class="s2">React</span>
<span class="s2">Vue</span>
<span class="s2">Vite, in process</span>
<span class="s1">Zod, class-validator</span>
<span class="s2 nest">Modules</span>
<span class="s2 nest">Dependency injection</span>
<span class="s2 nest">Guards</span>
<span class="s1 nest">Pipes</span>
<span class="s1 nest">Interceptors</span>
<span class="s1 nest">Config</span>
<span class="s2 nest">TypeORM, Prisma</span>
<span class="s2 nest">Queues</span>
<span class="s1 nest">Scheduling</span>
<span class="s2 nest">WebSockets</span>
<span class="s1 nest">Mail</span>
<span class="s1 nest">Caching</span>
<span class="s1 nest">Events</span>
<span class="s1 nest">OpenAPI</span>
<span class="s1 nest">Microservices</span>
</div>

Note: The batteries slide. Do not read it. Let them look for a few seconds, then explain the two colours.

The dark and blue words are nestjs-mvc: everything from the page to the browser and back. Forms, validation, flash, uploads, partial and deferred loading, infinite scroll, polling, prefetching, optimistic updates, shared data, error pages, server rendering per route, CSRF on by default, signed links, history encryption, CSP nonces, the version reload after a deploy. Express and Fastify, React and Vue.

The grey words are NestJS and its ecosystem: modules, injection, guards, pipes, config, an ORM, queues, scheduling, websockets, mail, caching, events, OpenAPI for the API you might still want for a mobile app.

Together: this is the batteries-included framework from act one. Auth, database, mail, websockets, background jobs, and a modern V. In TypeScript. Nothing on this slide is a vendor you have to pick.

---

<div class="split">
<div>

## Standing on Inertia

<ul>
<li>The protocol is Inertia</li>
<li>Jonathan Reinink, now the Laravel team</li>
<li>nestjs-mvc is the NestJS server half</li>
<li>The client is Inertia's, re-exported</li>
<li>Not a reinvention, a port</li>
</ul>

</div>
<figure class="slot" data-image="act3-inertia.png">
<img class="illustration" src="/illustrations/act3-inertia.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Credit where it is due, and say it openly, because the Laravel people in the room already recognised everything. The way the browser and the server talk, the JSON you saw two slides ago, the partial reloads, the deferred props: that is the Inertia protocol.

Jonathan Reinink created it in 2019 for Laravel, and the Laravel team maintains it now, with Inertia 2 at the end of 2024. It is a small, open, documented protocol, and it has been in production in thousands of Laravel apps for years.

nestjs-mvc is the server half of that protocol, written for NestJS, plus the client half re-exported so you import everything from one package. Plus the things Laravel gives you around it that Nest did not have: validation errors back to the form, flash without sessions, signed links, the login redirect, CSRF.

Not a reinvention. I did not want to be the person who rebuilds a thing badly and gives it a new name. It is a port of a proven idea to the backend framework we actually use.

---

<div class="split compact">
<div>

## Demo: Todoish

<ol>
<li>Prefetch: hover, click, 0 ms</li>
<li><code>useHttp</code>: quick add</li>
<li>Optimistic + flash: done, undo</li>
<li><code>optional()</code>: a task by URL</li>
<li>Upload + error bags</li>
<li>Precognition: a filter</li>
<li><code>defer()</code> + rescue</li>
<li>Polling + <code>deepMerge()</code>: live cards</li>
<li>Signed URLs + SSR: a share link</li>
</ol>

</div>
<figure class="slot" data-image="act3-demo.png">
<img class="illustration" src="/illustrations/act3-demo.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Introduce the app in two sentences. Todoish is a todo app in the style of Todoist, built on nestjs-mvc. TodoMVC built the same todo app in every framework to compare them, and put the model, the view and the controller all in the browser. Todoish puts the model and the controller back on the server, with the view in the client.

Before the talk: app running, logged in as Ada, the Network tab open in a second window, a terminal ready for the collaborator script, an .exe and a PNG on the desktop, and a private window ready for step 9. Nine steps is about twelve minutes; if time is short, drop 4, 5 and 7.

1. Prefetch. On stage: hover Inbox or a project in the sidebar, then click. They see: a prefetch request on the hover, then a click that comes from the cache, 0 ms. Code: frontend/layouts/AppLayout.tsx.

2. useHttp. On stage: press Q and type "Pay rent every month p2 #Home @errands". They see: the words light up while you type, one JSON request, and the page does not change. Code: src/tasks/tasks.controller.ts (parse), frontend/components/QuickAdd.tsx.

3. Optimistic update + flash. On stage: tick a task on Today, then click Undo. They see: the task disappears at once, only tasks and counts are reloaded, and the Undo arrives through the flash. Code: frontend/lib/tasks.ts, src/tasks/tasks.controller.ts (complete).

4. optional(). On stage: open a task, copy the ?task= URL and reload that page. They see: only task and comments come along, the list is there first, then the task loads. Code: src/tasks/task-detail.ts, frontend/components/TaskDialog.tsx.

5. Upload + error bags. On stage: drag an .exe into the dialog, then a PNG. They see: an error under the comment field only, then the image appears in the comment. Code: src/comments/comments.controller.ts, src/common/file.pipe.ts.

6. Precognition. On stage: Filters & Labels, click +, type "(today | p1" and then close the bracket. They see: first "A bracket is opened but never closed." from the parser on the server, then "Looks good", and nothing is saved. Code: src/filters/filters.schemas.ts, frontend/pages/Filters/Index.tsx.

7. defer() + rescue. On stage: open Productivity, then ?nap=1 on the Karma tab. They see: three deferred requests at the same time, Karma fails, and the page stays up. Code: src/productivity/productivity.controller.ts, frontend/pages/Productivity/Index.tsx.

8. Polling + deepMerge(). On stage: open the project "Todoish launch" as Ada and run npm run collaborator:demo. They see: Grace's cards appear and disappear live, and every poll asks for changes and cursor only. Code: src/projects/projects.controller.ts (show) and the project page in frontend/pages (TODO: the path was cut off in your notes).

9. Signed URLs + SSR. On stage: Share, Make link, open it in a private window, then open the link once more. They see: View source shows HTML from the server; the second time is a 403, and so is a link with a changed id. Code: src/invitations/invitations.controller.ts.

---

## Where to find it

<ul>
<li><a href="https://github.com/ravenberg/nestjs-mvc">github.com/ravenberg/nestjs-mvc</a></li>
<li>Docs: TODO add the docs URL</li>
<li><code>npm install nestjs-mvc</code></li>
<li>The docs and these slides run on it</li>
</ul>

Note: TODO: fill in the docs URL on the slide before presenting.

GitHub: the package, a kitchen-sink app with a page per feature, and the docs site, all in one repo. Issues and pull requests welcome; it is a community project, not affiliated with the NestJS team, MIT licensed.

The docs: the Getting started section is what you just saw. Every feature from the cloud has a page, in React and in Vue.

npm: one package. The server adapter, the Vite plugin and the client.

And the docs site and this slide deck are nestjs-mvc apps themselves. The docs are server-rendered on every route, the slides are Markdown files that a controller reads and a React page renders. If you want to see a real one, read the source of the thing you are looking at.

---

<div class="split">
<div>

## Will there still be a frontend developer?

<ul>
<li>The glue is what's at risk</li>
<li>The craft isn't</li>
<li>Own the feature, end to end</li>
<li>An agent needs one codebase too</li>
</ul>

</div>
<figure class="slot" data-image="act3-frontend-future.png">
<img class="illustration" src="/illustrations/act3-frontend-future.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>
</div>

Note: Slow down. This is the part they came for, even if the invitation said NestJS.

The glue is what's at risk: be honest about it. The fetch layer, the copied DTO, the loading state, the cache key, the mock server. That work is already what agents do best, because it is mechanical. If your job is mostly glue, the uncertainty you feel is justified.

The craft isn't: the judgement about what a screen should do, how an interaction should feel, what a user needs at this step, which state is worth keeping. Nobody is automating taste and product sense any time soon. The component model you know is still the best V there is.

Own the feature, end to end: the way to get out from under the uncertainty is to be the person who ships the whole thing. Not a backend developer, a product engineer. And with a full-stack monolith in TypeScript, the distance from a React component to the database is one file, in a language you already write, with decorators and props you already understand. You do not have to become someone else.

An agent needs one codebase too: the same architecture that makes you full stack makes the agent full stack. One repo, one prompt, one diff: migration, controller, page, test. The split stack halves what an agent can do for you. The monolith doubles it. That is not a coincidence, it is the same reason.

---

<!-- .slide: class="center-slide" -->

<div class="one-liner">A full-stack role, on a full-stack monolith.</div>

<p>I believe that is the way forward.</p>

Note: Say it as a belief, not a fact: I believe. We split the stack for 2012, and we got what we wanted. In 2026 the trade no longer pays. The frontend framework you love can be the V. The backend framework you were afraid of turns out to be decorators and return values. And the agent you are unsure about becomes a multiplier instead of a second integration problem.

One codebase, one person, one prompt, one feature. That is the pitch.

---

<!-- .slide: class="center-slide" -->

# Questions?

<p>github.com/ravenberg/nestjs-mvc</p>

<figure class="slot small" data-image="act3-questions.png">
<img class="illustration small" src="/illustrations/act3-questions.png" alt="" onerror="this.parentElement.classList.add('missing'); this.remove()">
</figure>

Note: Likely questions and the short answers.

Is this just Inertia? Yes, the protocol is Inertia, on purpose. nestjs-mvc is the NestJS server adapter plus the client and the things around it that Nest lacked: errors back to forms, flash without sessions, the login redirect, signed links, CSRF.

Why not AdonisJS, it has an official Inertia adapter? Adoption. NestJS is the TypeScript backend in the job market and in our company. This gives NestJS the same story.

Why not Next with server actions? Rendering framework versus application framework. Where are your queues, your injection, your guards, your scheduled jobs? And Next couples you to one deploy target's way of thinking.

What about a mobile app? Build an API for it, in the same NestJS app, next to your pages. Nothing stops you, and the API you design for a real second client is worth designing.

SEO? Server rendering per route with one decorator, @Ssr(). The docs site does it on every page.

Vue? Yes, today. Svelte? Inertia has a client for it, it is not wired in nestjs-mvc yet.

Testing? supertest against controllers like any NestJS app, Playwright against pages. The kitchen sink is tested that way.

Authentication? Your guards, unchanged. An UnauthorizedException on a page becomes a redirect to login, and intended() sends people back afterwards.

Lock-in? The pages are plain React, the controllers are plain NestJS, and the protocol is open. If you leave, you keep both halves.
