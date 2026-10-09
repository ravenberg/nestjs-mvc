---
title: NestJS in MVC mode
description: Three acts. Why we split the stack in two, what MVC with a real View looks like, and how nestjs-mvc puts the two halves back together.
---

<div class="split">
<div>

# NestJS in MVC mode

<div class="one-liner">The view is your frontend framework.</div>

<p class="byline">Lee Ravenberg · github.com/ravenberg/nestjs-mvc</p>

</div>
<img class="illustration" src="/illustrations/notioly/tech-briefing.svg" alt="">
</div>

Note: Open cold. Say the one-liner out loud and let it sit for a beat: the view is your frontend framework.

Then the shape of the talk, in three acts. **The why**: how we ended up with a frontend and a backend as two separate things, and what that cost us. **The what**: the old pattern that solved this, and the gap that is still in it. **The how**: the code, the features, and a demo. Questions at the end. About forty minutes, then the floor is theirs.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">Act I</p>

# The why

<p>How we got here, and what it cost.</p>

Note: A short history lesson, not out of nostalgia. It is here to make one point: the split between frontend and backend was a choice. A deliberate one, made for good reasons. And every choice has a price we rarely add up.

Quick show of hands to warm the room up: who has worked on a server-rendered app with a bit of jQuery on top? And who has built a React app against a REST API? That is the journey we are tracing.

---

<div class="split">
<div>

## 2005: the page was the app

<ul>
<li>Every click is a round trip to the server</li>
<li>The whole page comes back as HTML</li>
<li>Forms just POST, and the server redirects</li>
<li>JavaScript only for sprinkles: jQuery, a datepicker</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/newspaper.svg" alt="">
</div>

Note: Rails is one year old, Django and Symfony just came out, PHP is everywhere. The mental model is simple.

The browser asks for a URL, the server builds the page. Request in, HTML out.

No JSON, no client state. The server owns everything, the browser is a viewer.

Submit, validate, save, redirect, render. Nobody wrote a fetch call for a form.

Javascript just for small things; jQuery arrives in 2006. A datepicker, an accordion, a bit of Ajax to avoid a full reload. Nobody called it a frontend. It was decoration on a page the server owned.

One framework, one monolith shipped the whole app.

---

<div class="split">
<div>

## 2007: the phone raised the bar

<ul>
<li>Native apps: instant, animated, offline</li>
<li>No white flash between screens</li>
<li>Users learned what an app should feel like</li>
<li>Web apps suddenly felt like documents</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/touch-screen.svg" alt="">
</div>

Note: 
Smartphones raised the bar

**Native apps: instant, animated, offline.** The iPhone in 2007, the App Store in 2008. Native apps were different. They kept their state, slid between screens, and worked on a bad connection.

**No white flash between screens.** That is the thing everyone noticed. Tap, and the screen slides. On the web: click, white page, wait, paint.

**Users learned what an app should feel like.** Expectations moved, permanently. Your users compared your web product to the apps on their phone, not to other websites.

**Web apps suddenly felt like documents.** A product that reloaded on every click felt old overnight. And we, the people building for the web, wanted the native feel. That is the motive for everything that follows. It was a good motive.

---

<div class="split">
<div>

## So we split the stack

<ul>
<li>The UI moves into the browser: Backbone, Angular, React</li>
<li>The server shrinks to a JSON API</li>
<li>One product, two codebases</li>
<li>Two codebases, two teams</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/cutting.svg" alt="">
</div>

Note: **The UI moves into the browser.** Backbone in 2010, AngularJS in 2010, React in 2013, Vue in 2014. The interface now lives in the browser, where it can keep state and animate like a native app.

**The server shrinks to a JSON API.** It no longer renders anything. It answers questions in JSON. REST first, GraphQL from 2015. Mobile apps needed that same API anyway, which made the case easy to make.

**One product, two codebases.** Different languages at first, different build tools, different deploy cycles.

**Two codebases, two teams.** And because the halves were so different, we split the people too. Frontend developers and backend developers became separate job titles.

This was a conscious, defensible decision. Nobody was stupid. We wanted a rich, app-like experience, and in 2012 this was the only way to get it.

---

<div class="split">
<div>

## And it worked

<ul>
<li>Interfaces that feel native: Gmail, Figma, Linear</li>
<li>Components: the best UI model we have ever had</li>
<li>A huge ecosystem, and a job market</li>
<li>Frontend became a discipline of its own</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/achievement.svg" alt="">
</div>

Note: Be generous here. This is the audience's craft, and it deserves the credit.

**Interfaces that feel native.** Gmail, Figma, Linear, Notion. None of them are possible with a template per click.

**Components.** The component model is the best thing that happened to UI development. Composition, props, state, a tree. We are not giving that up, and that matters for the rest of the talk.

**A huge ecosystem, and a job market.** Design systems, testing tools, bundlers. Whole careers, including most of the ones in this room.

**Frontend became a discipline of its own.** With its own depth, its own conferences, its own seniority ladder.

Then the turn: but we traded something for it. Several things, actually. Let's count them.

---

<!-- .slide: class="center-slide" -->

<div class="one-liner">Every trade has two sides.</div>

<p>Seven things we gave up without noticing.</p>

<img class="illustration small" src="/illustrations/notioly/pros-and-cons.svg" alt="">

Note: Seven trade-offs follow, one per slide. Keep the pace up, about a minute each. They build towards the last one, which is the one that matters most in 2026.

---

<div class="split">
<div>

## One deployment became two

<ul>
<li>SPA on a CDN, API on servers: two pipelines</li>
<li>The API must stay compatible with yesterday's bundle</li>
<li>A tab opened yesterday runs old JavaScript on today's API</li>
<li>Every feature flag lives on both sides</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/shipping.svg" alt="">
</div>

Note: **SPA on a CDN, API on servers.** Two CI configs, two sets of environment variables, two preview environments per pull request, and a deploy order to get right every time.

**The API must stay compatible with yesterday's bundle.** The API goes first, and it has to keep serving the frontend that is already out there. You are now versioning an API whose only consumer is yourself.

**A tab opened yesterday runs old JavaScript on today's API.** Every team learns this one the hard way, once, in production.

**Every feature flag lives on both sides.** A flag on the server and the same flag on the client, and they had better agree.

The monolith had one artifact, one version, one deploy. That was not a limitation. It was a feature we did not know we had.

---

<div class="split">
<div>

## The monorepo became an achievement

<ul>
<li>Turborepo, Nx, workspaces: tooling to glue two halves</li>
<li>A shared-types package, so both halves agree</li>
<li>A codegen step that breaks when someone forgets to run it</li>
<li>The monolith had all of this. It was called an import</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/tower-of-cards.svg" alt="">
</div>

Note: **Turborepo, Nx, workspaces.** Whole tools, whole conference talks, about getting two codebases to live in one repo and build in the right order. Task graphs. Remote caching.

**A shared-types package.** The first package in every monorepo. Its only purpose is to let the frontend know what the backend returns.

**A codegen step.** Or we generate a client from an OpenAPI spec, and add a build step that breaks when someone forgets to run it.

**The monolith had all of this.** In a monolith the shared type is an import, and the build order is the compiler. The monorepo is a clever solution to a problem we created ourselves.

---

<div class="split">
<div>

## Batteries not included

<ul>
<li>Rails, Laravel, Django: auth, ORM, mail, jobs, sockets in the box</li>
<li>The SPA stack: pick a vendor for each of those</li>
<li>Next and Nuxt stop at rendering and route handlers</li>
<li>Nobody has an opinion about the whole app anymore</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/empty-box.svg" alt="">
</div>

Note: **Rails, Laravel, Django.** The heavyweight frameworks shipped everything an application needs: authentication, an ORM with migrations, mail, background jobs, websockets, validation, sessions, CSRF, a scheduler. Laravel calls it batteries included, Rails calls it omakase. You start with a working application and add your domain.

**The SPA stack: pick a vendor.** An auth provider, an ORM, a job runner, an email service, a websocket service, a validation library. Then make them agree with each other. Every project, again.

**Next and Nuxt stop at rendering and route handlers.** They are brilliant at what they do, and what they do ends at the route handler. No injection, no modules, no queues, no mailer, no guards.

**Nobody has an opinion about the whole app anymore.** That opinion was the thing that made a single developer productive. It got lost in the split.

---

<div class="split">
<div>

## The contract tax

<ul>
<li>Every DTO exists twice: a server type, a client type</li>
<li>Every validation rule exists twice, and drifts</li>
<li>Every fetch needs a loading, an error and an empty state</li>
<li>A cache in the browser that mirrors the database</li>
<li>The server already knew all of it</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/copycat.svg" alt="">
</div>

Note: **Every DTO exists twice.** A type on the server, a type on the client, and a conversation about the shape in between. Pagination envelopes. Error formats. Which status code a validation failure gets.

**Every validation rule exists twice.** The rules live on the server, we copy them to the client for a nice form, and then they drift.

**Every fetch needs three extra states.** Loading, error, empty, plus a spinner and a retry. Multiply by the number of screens.

**A cache in the browser that mirrors the database.** Query keys, stale times, refetch on focus, optimistic rollbacks. An entire discipline about keeping a copy of the server's data in sync with the server.

**The server already knew all of it.** This is the line to land. When the server answered that request, it had the user, the permissions, the data and the rules, in one place. We threw that away and rebuilt it in the browser.

---

<div class="split">
<div>

## Team dynamics

<ul>
<li>One feature: two tickets, two reviews, one alignment meeting</li>
<li>The frontend waits for the endpoint, so it mocks it</li>
<li>The mock drifts, and integration day eats the sprint</li>
<li>Want to go full stack? Open a ticket on another board</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/waiting-in-line.svg" alt="">
</div>

Note: **One feature: two tickets.** Two sprint plannings, two reviewers, and a meeting to agree on the contract. The feature itself did not get bigger.

**The frontend waits for the endpoint.** It is ready and cannot ship, so it mocks the API.

**The mock drifts.** And the mock is what you tested against. Integration day is where the sprint goes to die.

**Want to go full stack? Open a ticket on another board.** This one is personal for a lot of people. A frontend developer who wants one more field in a response has to ask another team. Not because the work is hard, but because the architecture drew a wall there, and the org chart grew around the wall. We built a split system and then hired a split organisation to match it.

---

<div class="split">
<div>

## And now: agent context

<ul>
<li>A coding agent works inside one repository</li>
<li>The contract between repos lives in a spec, or a Slack thread</li>
<li>Two repos means two prompts, half a feature each</li>
<li>You are the integration layer again</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/ai-assistant.svg" alt="">
</div>

Note: Slow down here. This trade-off did not exist two years ago, and it is the reason this talk exists now.

**A coding agent works inside one repository.** It reads the controller, it reads the test, it edits both. Its whole world is what is on disk in one working tree.

**The contract between repos lives in a spec, or a Slack thread.** The agent on the API side cannot see the consumer. The agent on the frontend side cannot see what the endpoint really returns. Both work half blind, and the agreement lives in a place neither of them can read.

**Two repos means two prompts, half a feature each.** And you reconcile the two results by hand.

**You are the integration layer again.** The expensive, slow, human integration layer. Exactly the part we hoped the agent would take off our hands. In a monolith, one prompt is one feature: the migration, the controller, the page and the test, in one diff, in one context window. The architecture decides how much an agent can do for you.

---

<div class="split">
<div>

## We even brought the server back

<ul>
<li>SSR, server components, server actions</li>
<li>Remix loaders and actions are GET and POST handlers</li>
<li>Ten years removing the server, five years putting it back</li>
<li>We got a server back, not a backend framework</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/moving.svg" alt="">
</div>

Note: **SSR, server components, server actions.** Next.js put rendering back on the server from 2016. Then React Server Components. Then server actions: a function on the server, called from a form. Sound familiar? It is a POST to a controller.

**Remix loaders and actions.** Remix said it out loud: a loader is a GET handler, an action is a POST handler, and the page gets the loader's data as props. That is MVC with the names changed.

**Ten years removing the server, five years putting it back.** The industry has already concluded that the pendulum swung too far. The frontend world is rediscovering the request-response cycle, from its own side.

**We got a server back, not a backend framework.** That is the catch. You get a server with your React app, but no modules, no injection, no queues, no guards. Which brings us to act two.

---

<!-- .slide: class="center-slide" -->

<div class="one-liner">We didn't choose wrong. We chose for 2012.</div>

<img class="illustration small" src="/illustrations/notioly/crossroad.svg" alt="">

Note: The reasons were valid: templates could not give us the native feel, so we moved the view to the browser and paid for it in deployments, tooling, contracts, teams, and now agent context.

The question for the rest of the talk: do we still have to pay? Spoiler: no.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">Act II</p>

# The what

<p>MVC, and the V it never had.</p>

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
<li>Smalltalk, 1979: separate knowing, deciding and showing</li>
<li>On the web: request in, controller decides, view renders</li>
</ul>

Note:
MVC was the pattern used to build applications with 

**Smalltalk, 1979.** Trygve Reenskaug at Xerox PARC. Older than most of us. The idea: separate what the app knows, from what it decides, from what it shows.

**On the web it became a pipeline.** A request hits a controller. The controller talks to the model, your data and your rules. It hands a result to a view, and the view becomes the response.


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

<p>The V was always a template. A template renders a page, and a page is not an app.</p>

Note: Every heavyweight framework came with its own templating language for the View, server-owned, and the framework owned the whole triangle.

That is what batteries included meant in practice: model, view and controller in one box, with authentication, mail and jobs around it. One developer could build a complete product because the framework had an opinion about all three letters.

**The V was always a template.** And every one of these V's hit the same wall in 2010: a template renders a page, and a page is not an app. That wall is the reason we jumped and split the stack.

---

<div class="split">
<div>

## Meanwhile, I was learning NestJS

<ul>
<li>Modules, dependency injection, guards, pipes</li>
<li>A backend framework that happens to speak HTTP</li>
<li>Learned about shared state</li>
<li>Then I found the MVC page in the docs</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/learning.svg" alt="">
</div>

Note: In between clients -> thinking about my role as a frontend developer in the age of AI. Figured that positioning myself as a full-stack developer would be a good idea, and NestJS was the framework I picked to learn.

**Modules, dependency injection, guards, pipes.** NestJS, 2017, Kamil Myśliwiec. It looks like Angular on the server, on purpose. Modules own their providers, everything is injected, everything is testable.


**A backend framework that happens to speak HTTP.** Not a rendering layer with a server bolted on. The other way round.

**Then I found the MVC page.** In the docs, under Techniques, there is a page called MVC. I got excited. Then I read it.

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
<li>Install Handlebars, point Nest at a views folder</li>
<li><code>@Render()</code> hands your object to a template</li>
<li>Technically MVC. It stops where our work starts</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/reading-the-notes.svg" alt="">
</div>

Note: **Install Handlebars, point Nest at a views folder.** That is the whole page. Install hbs, set the view engine, put your templates in a folder.

**@Render() hands your object to a template.** Put Render on a handler, return an object, and the template gets it as its context. Honest, minimal, and correct.

**Technically MVC.** It is: the controller decides, the template shows. And it stops at exactly the wall the 2005 frameworks hit. A template is a page, and a page is not an app. Everyone in this room has scrolled past that page thinking: nice, but not for me.

---

## Two kinds of framework

<div class="columns">
<div>

### NestJS

<ul>
<li>Modules and dependency injection</li>
<li>Guards, pipes, interceptors</li>
<li>Config, queues, scheduling, caching</li>
<li>WebSockets, microservices, GraphQL, OpenAPI</li>
<li>A CLI, testing utilities, eight years of ecosystem</li>
</ul>

</div>
<div>

### Next, Nuxt

<ul>
<li>Rendering and routing</li>
<li>Route handlers and server actions</li>
<li>Middleware at the edge</li>
<li>Built with one deploy target in mind</li>
<li>Auth, database, jobs, mail: pick a vendor</li>
</ul>

</div>
</div>

Note: Respect where it is due, on both sides. This slide is not there to bash Next or Nuxt. They are excellent at what they do. The point is what they are.

**Left: an application framework.** NestJS has an opinion about how your app is structured, how dependencies flow, how requests are validated, how work is queued, how it is tested. It has had that opinion for eight years, with a large ecosystem behind it.

**Right: a rendering framework with a server.** Routing, rendering strategies, a way to run a function on the server. Then a shopping list: auth from a vendor, database from a vendor, jobs from a vendor, email from a vendor.

If the question is "which of these lets one developer build a whole product", the answer is on the left. What the left lacks is a modern V. That gap is the whole opportunity.

---

<div class="split compact">
<div>

## Handlebars is fine, but

<ul>
<li>Search that filters as you type</li>
<li>Drag and drop between columns</li>
<li>Editing a cell in place</li>
<li>"That name is taken", before you submit</li>
<li>Feeds that load more as you scroll</li>
<li>Dashboards that refresh themselves</li>
<li>Instant actions with an undo</li>
<li>Wizards that remember every step</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/apps.svg" alt="">
</div>

Note: I am not here to bash Handlebars. For a settings page or an admin list it is perfectly fine. But look at what our users expect, and what our products actually are. Pick four or five of these and say them with the product name.

**Search that filters as you type.** Linear, the search box in any docs site. The list filters on every keystroke.

**Drag and drop between columns.** Trello, Jira boards. Pick up a card, the column reorders under your cursor.

**Editing a cell in place.** Notion, Airtable. Click a cell, type, it saves. No edit page.

**"That name is taken", before you press submit.** Validation while you type.

**Feeds that keep loading as you scroll.** Any social timeline. Scroll, more arrives, the position stays.

**Dashboards that refresh themselves.** A deploy status, a queue length, updating while you look at it.

**Actions that feel instant and can be undone.** Archive in Gmail, a like button. The UI answers before the server does.

**Wizards that remember every step.** A checkout where step three still knows what you typed in step one, even after the back button.

Every one of these needs state in the browser and partial updates from the server. A template that re-renders the whole page on every click is 2005 again. This is the need Handlebars cannot meet, and it is exactly the need that pushed us into the split.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">The hypothesis</p>

<div class="one-liner">What if the V in MVC was your frontend framework?</div>

<img class="illustration small" src="/illustrations/notioly/fresh-idea.svg" alt="">

Note: 
So I wondered; what if the View in MVC could be my front-end library? Like React or Vue?! What if we plug the one into the other?

Keep the Model and the Controller exactly as they are in NestJS. Replace the template with a component tree. 

This is what I started to pursue. And this is where I arrived at.

---

<!-- .slide: class="center-slide" -->

[//]: # (<p class="kicker">The reveal</p>)

# NestJS-MVC

<p>NestJS controllers return React or Vue pages.<br>It feels like a single-page app. You build it like a monolith.</p>

<img class="illustration small" src="/illustrations/notioly/project-launch.svg" alt="">

Note: The reveal. Say it plainly: I built it. It is called nestjs-mvc, it is on npm, and the docs site and the slides you are looking at run on it.

Then the three claims, slowly. **A NestJS controller returns a page**: a React or Vue component, with the object the controller returned as its props. **It feels like a single-page app**: after the first visit, every link and every form is a JSON exchange and the page swaps in place, layout intact. **You build it like a monolith**: one repo, one process, one deploy, one language, one context window.

Then: let me show you what that looks like.

---

<!-- .slide: class="center-slide" -->

<p class="kicker">Act III</p>

# The how

<p>The code, the batteries, the demo.</p>

Note: Act three is code, and it follows the Getting started section of the docs almost one to one. Install, a first page, links, layouts, forms, and how it works under the hood. Then the rich experiences from act two, revisited. Then the batteries, credit where it is due, the demo, and where to find it.

---

## Install

```sh
npm install nestjs-mvc @inertiajs/react react react-dom
npm install -D vite @vitejs/plugin-react
```

```ts {|3,7}
// vite.config.ts
import react from '@vitejs/plugin-react'
import { nestjsMvc } from 'nestjs-mvc/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), nestjsMvc()],
})
```

Note: **Two commands** in an existing NestJS project. Vue works the same with the Vue packages; everything in this act is React because that is what most of you write.

**One Vite plugin.** Press the arrow once: the only new thing in this config is the nestjsMvc plugin, next to the React plugin you already know. It generates the client entry from the pages in frontend/pages, so there is no main.tsx to write, no createRoot, no router config. It also picks up frontend/app.css if it exists, and it makes vite build produce the client and the SSR bundle in one go.

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

Note: Two arrow presses on this slide.

**First press: MvcModule.forRoot({ vite: {} }).** One module import. With vite: {}, the Vite dev server runs inside your Nest process while you develop: same port, hot reload included. You run npm run start:dev and open one URL. In production the same option serves the built files.

**Second press: the validation pipe.** The pipe you probably already have, with one exception factory from nestjs-mvc. That factory is what turns a failed DTO into errors on the form, which you will see in a few slides. Zod or any Standard Schema library works too.

That is the whole setup: a Vite config, a module, a pipe. Now a page.

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

```tsx
// frontend/pages/Home.tsx
type Props = { name: string }

export default function Home({ name }: Props) {
  return <h1>Hello, {name}</h1>
}
```

</div>

Note: Left is the controller, right is the page. Two arrow presses, both on the left.

**First press: @View('Home').** This handler renders the page called Home, which is frontend/pages/Home.tsx. Folders work: Users/Show is frontend/pages/Users/Show.tsx, and most apps end up with a folder per controller.

**Second press: return { name: 'Ada' }.** The return value is a plain object, and that object becomes the props of the component on the right. Look at the right side: a normal React component. No fetch, no hook, no loading state, no client, no type written twice.

Say the sentence from the docs: the object your controller returns becomes the props of the component, and that is really the whole idea. Everything after this slide is refinement.

---

## It is still NestJS

```ts {|3|7|8-9}
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

Note: Three arrow presses.

**First: the constructor.** A service injected, like always.

**Second: the handler signature.** A route parameter with a pipe, like always. A guard on this controller works like always too: an UnauthorizedException on a page becomes a redirect to your login page, and after logging in the user comes back to where they were going.

**Third: the service call and the return.** Pick the fields you send. Everything you return ends up in the browser, so do not return a whole entity with a password hash in it. Same discipline as designing an API response, except you do it once, at the one place that renders this page.

For the NestJS people in the room: nothing changed. For the React people: this is the entire backend you need to learn to render a page. A decorator and a return value.

---

## Links

```tsx {|10|4-5,9}
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

Note: Everything a page needs comes from one import, nestjs-mvc/react. Two arrow presses.

**First: Link.** It renders a normal anchor. When someone clicks it, the browser asks the controller for just the data and swaps the page in place. The URL updates, the back button works, the layout stays. A Link can also POST or DELETE, rendered as a button: log out is a Link with method post.

**Second: router.get from a search box.** The same thing from code: re-run the same controller with a query parameter. preserveState keeps what the user typed while the list updates. This is the search-as-you-type from act two, in one line. And if only the list depends on the search, you can ask for only that prop; that is a partial reload, and it comes later.

---

## Layouts and titles

```tsx {|5|8-10}
import { Head } from 'nestjs-mvc/react'
import { AppLayout } from '../../layouts/AppLayout'

export default function Index({ users }) {
  return <><Head title="Users" /><h1>Users</h1></>
}

Index.layout = (page) => (
  <AppLayout>{page}</AppLayout>
)
```

Note: Two arrow presses.

**First: Head.** It sets the title of the browser tab, or any tags you want in the head.

**Second: Index.layout.** A layout is an ordinary component with a nav and a main, attached to a page with one static property. The part that matters: the layout is not rebuilt on every visit. It stays mounted while you move between pages, so an open menu stays open and a playing video keeps playing. That is the single-page-app feel, and it is exactly where a template per request could never go.

---

## Forms, server side

```ts {|1-4|10-12|14-18}
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

Note: Three arrow presses.

**First: the DTO.** class-validator rules, exactly what you would write for an API.

**Second: the GET.** It renders the empty form. Nothing to return yet.

**Third: the POST.** Validate through the DTO, save, redirect. Then point at what is not there: no code for when validation fails. The pipe throws, and nestjs-mvc sends the user back to the form with the field errors attached. No error response to design, no status code debate, nothing to catch. A rule that needs the database, like "this email is taken", throws a ValidationException from anywhere in the handler and arrives at the form the same way.

This is the Laravel flow. If you have not seen it before, it feels like cheating. POST, redirect, GET.

---

## Forms, client side

```tsx {|4|5|13|14}
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

Note: Four arrow presses.

**First: useForm.** It holds the data. The input in the middle is a plain controlled input, nothing new.

**Second: form.post.** A real POST to the handler on the previous slide.

**Third: form.errors.** One message per field, filled after the redirect back. No error state to design.

**Fourth: form.processing.** True while the request runs, so the button disables itself.

That is the whole loop: a GET renders a page, a POST changes something and redirects, the next GET renders fresh state. Nothing on the client remembers what the server knows better. No mutation hook, no cache to invalidate.

---

## Flash messages

```ts {|4}
@Post()
async store(@Body() dto: CreateUserDto) {
  const user = await this.users.create(dto)
  return this.view.flash('message', `${user.name} was added.`).redirect('/users')
}
```

```tsx {|2,4}
export default function Index() {
  const { flash } = usePage()

  return <>{flash?.message && <p className="notice">{String(flash.message)}</p>}</>
}
```

Note: Two arrow presses.

**First: flash, then redirect.** Attach a message to the redirect.

**Second: read it from usePage on the page you land on.** It shows once and is gone on the next visit or a refresh, which is exactly what you want from a "Saved" message. Put the notice in your layout once and every page has it.

One sentence on the mechanism: there is no session store. Flash messages and form errors travel in a signed cookie, so one Nest process serves every user without keeping anything between requests, and one user's data can never leak into another's page.

---

## How it works

```json {|2|3|5}
{
  "component": "Users/Show",
  "props": { "user": { "id": 1, "name": "Ada" } },
  "url": "/users/1",
  "version": "a1b2c3"
}
```

<ul>
<li>First visit: a full HTML page with the props inside</li>
<li>Every visit after: this JSON, and the page swaps</li>
<li>After a deploy: the version changes, old tabs reload once</li>
</ul>

Note: **First visit: a full HTML page with the props inside.** The browser asks for a URL, the controller runs, and nestjs-mvc sends HTML: your scripts, the page name and the props as JSON in a script tag, and an empty element. The client reads it and renders the component.

**Every visit after: this JSON.** A Link sends the same request with one extra header that says "only the data, please". The same controller runs, the answer is this object. Three arrow presses: which component, its props, and a version. The browser swaps the page and keeps the layout.

**After a deploy: old tabs reload once.** The version is the deploy story from act one, solved. A tab on the old version asks for data, the server sees the old version and tells it to do one full reload. Yesterday's tab against today's API: handled.

You can watch all of this in the Network tab, and we will in the demo.

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

**Search as you type, with only.** The controller runs, but only the results prop is computed and sent. A prop can be a function, and a function nobody asked for never runs its query.

**Validate while typing.** form.validate on blur sends the field to the same pipe with the same DTO. The rules stay on the server; the user sees the error before submitting.

**Polling, optimistic, deferred, prefetch.** usePoll every five seconds for one prop. Optimistic: change the props on the client first, send the PATCH, the server's answer confirms or rolls back. Deferred: the page shows, the slow stats arrive a moment later with a fallback. Prefetch: the page loads on hover so the click is instant.

None of this needed a second codebase.

---

## One of them, in full

```ts {|1-5|10-12|13}
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

Note: The drag-and-drop board from act two, the whole thing. Three arrow presses.

**First: the server.** A PATCH that moves the ticket and sends the browser back to the page it came from. Four lines, a normal NestJS handler with a normal DTO.

**Second: the optimistic rewrite.** Before the request goes out, rewrite the props so the card is already in its new column.

**Third: the PATCH.** When the server answers, the fresh props replace the optimistic ones. If the server refuses, say a closed ticket stays closed, the props roll back and the error arrives like any form error.

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

Note: Do not read the cloud. Let them look for a few seconds, then explain the two colours.

**The dark and blue words are nestjs-mvc**: everything from the page to the browser and back. Forms, validation, flash, uploads, partial and deferred loading, infinite scroll, polling, prefetching, optimistic updates, shared data, error pages, server rendering per route, CSRF on by default, signed links, history encryption, CSP nonces, the version reload after a deploy. Express and Fastify, React and Vue.

**The grey words are NestJS and its ecosystem**: modules, injection, guards, pipes, config, an ORM, queues, scheduling, websockets, mail, caching, events, and OpenAPI for the API you might still want for a mobile app.

Together, this is the batteries-included framework from act one: auth, database, mail, websockets, background jobs, and a modern V. In TypeScript. Nothing on this slide is a vendor you have to pick.

---

<div class="split">
<div>

## Standing on Inertia

<ul>
<li>The wire protocol is Inertia, unchanged</li>
<li>Created by Jonathan Reinink, maintained by the Laravel team</li>
<li>nestjs-mvc is the server half, written for NestJS</li>
<li>The browser half is Inertia's own client, re-exported</li>
<li>Plus the Laravel conveniences NestJS never had</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/lending-a-hand.svg" alt="">
</div>

Note: Credit where it is due, and say it openly, because the Laravel people in the room recognised everything ten slides ago.

**The wire protocol is Inertia, unchanged.** The way the browser and the server talk, the JSON you saw two slides ago, the partial reloads, the deferred props: all of that is the Inertia protocol. Small, open, documented, and in production in thousands of Laravel apps for years.

**Created by Jonathan Reinink, maintained by the Laravel team.** Since 2019, with Inertia 2 at the end of 2024.

**nestjs-mvc is the server half, written for NestJS.** The adapter that speaks the protocol from inside a Nest controller.

**The browser half is Inertia's own client, re-exported.** You import everything from one package, but the client is theirs.

**Plus the Laravel conveniences NestJS never had.** Validation errors back to the form, flash without sessions, signed links, the login redirect, CSRF on by default.

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
<img class="illustration" src="/illustrations/notioly/to-do-list.svg" alt="">
</div>

Note: Introduce the app in two sentences. Todoish is a todo app in the style of Todoist, built on nestjs-mvc. TodoMVC built the same todo app in every framework to compare them, and put the model, the view and the controller all in the browser. Todoish puts the model and the controller back on the server, with the view in the client.

Before the talk: app running, logged in as Ada, the Network tab open in a second window, a terminal ready for the collaborator script, an .exe and a PNG on the desktop, and a private window ready for step 9. Nine steps is about twelve minutes; if time is short, drop 4, 5 and 7.

1. Inloggen via een diepe link
Doen: open een privévenster en ga direct naar /upcoming. Je komt op /login uit. Typ eerst een fout wachtwoord en log daarna in als ada@todoish.dev / password.
Zien: bij het foute wachtwoord staat er een foutmelding onder het e-mailveld. Na het inloggen kom je op Upcoming terecht, de pagina die je eerst wilde zien, en er verschijnt "Welcome back, Ada."
Wat het framework doet:
- De AuthGuard is een gewone NestJS-guard die een UnauthorizedException gooit. nestjs-mvc maakt daar zelf een redirect naar /login van en onthoudt waar je heen wilde. .intended('/today') stuurt je daarna terug naar die plek.
- Bij een fout wachtwoord gooit de controller een ValidationException. De fout komt vanzelf onder het juiste veld in het React-formulier terecht, zonder een API of fetch-code.
- De welkomstmelding is een flash message, en die werkt zonder server-side sessie.
- Het formulier is automatisch tegen CSRF beschermd. Je noemde "CORS", maar ik denk dat je CSRF bedoelde. Je hoeft er niets voor te doen. Alleen de webhook zet het bewust uit met @SkipCsrf().
- Code: src/auth/auth.controller.ts, src/auth/auth.guard.ts


2. Valideren terwijl je typt
Doen: log uit, ga naar Register, typ ada@todoish.dev in het e-mailveld en klik naar het volgende veld.
Zien: meteen staat er "Someone already signed up with that address", nog vóór je op verzenden klikt.
Wat het framework doet: form.validate('email') stuurt dat ene veld naar dezelfde pipe en hetzelfde Zod-schema als het echte verzenden. De regel "bestaat dit adres al" staat dus maar op één plek, op de server, en kan gewoon de database raadplegen.
- Code: src/auth/auth.schemas.ts, frontend/pages/Auth/Register.tsx

3. Infinite scroll
Doen: ga naar Upcoming en blijf naar beneden scrollen.
Zien: er verschijnt steeds een nieuwe week, en de ?page= in de URL loopt mee. Herlaad op ?page=5 en scroll omhoog: dan komen de eerdere weken erbij.
Wat het framework doet: de controller geeft een scroll()-prop terug met één week per pagina. <InfiniteScroll> vraagt de volgende week op en plakt die eronder. Je schrijft geen paginering-API en geen state op de client.
- Code: src/upcoming/upcoming.controller.ts, frontend/pages/Upcoming/Index.tsx


4. Taak afvinken en ongedaan maken
Doen: vink op Today een taak af en klik daarna op Undo.
Zien: de taak verdwijnt meteen, zonder wachten, en komt terug na Undo.
Wat het framework doet: de pagina past de lijst eerst zelf aan (optimistic) en stuurt dan pas het verzoek. Het antwoord van de server bevestigt de wijziging of draait hem terug. De Undo-knop komt mee als flash message.
- Code: frontend/lib/tasks.ts, src/tasks/tasks.controller.ts (complete)

---

<div class="split">
<div>

## Where to find it

<ul>
<li><a href="https://nestjs-mvc.ravenberg.dev">nestjs-mvc.ravenberg.dev</a></li>
<li><a href="https://todoish.ravenberg.dev">todoish.ravenberg.dev</a></li>
<li><a href="https://github.com/ravenberg/nestjs-mvc">github.com/ravenberg/nestjs-mvc</a></li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/link-sharing.svg" alt="">
</div>

Note: TODO: fill in the docs URL on the slide before presenting.

**GitHub.** The package, a kitchen-sink app with a page per feature, and the docs site, all in one repo. Issues and pull requests welcome. It is a community project, not affiliated with the NestJS team, MIT licensed.

**The docs.** The Getting started section is what you just saw. Every feature from the cloud has a page, in React and in Vue.

**npm.** One package: the server adapter, the Vite plugin and the client.

**The docs site and this deck run on it.** The docs are server-rendered on every route. The slides are Markdown files that a controller reads and a React page renders. If you want to see a real app, read the source of the thing you are looking at.

---

<div class="split">
<div>

## Will there still be a frontend developer?

<ul>
<li>The glue work is what agents automate first</li>
<li>Product sense and interaction craft are not</li>
<li>Own a feature end to end: the page, the data, the rule</li>
<li>One codebase is what an agent needs too</li>
</ul>

</div>
<img class="illustration" src="/illustrations/notioly/looking-at-the-horizon.svg" alt="">
</div>

Note: Slow down. This is the part they came for, even if the invitation said NestJS.

**The glue work is what agents automate first.** Be honest about it. The fetch layer, the copied DTO, the loading state, the cache key, the mock server. That work is mechanical, and mechanical work is what agents already do best. If your job is mostly glue, the uncertainty you feel is justified.

**Product sense and interaction craft are not.** Judgement about what a screen should do, how an interaction should feel, what a user needs at this step, which state is worth keeping. Nobody is automating taste. And the component model you know is still the best V there is.

**Own a feature end to end.** The way out from under the uncertainty is to be the person who ships the whole thing. Not a backend developer: a product engineer. With a full-stack monolith in TypeScript, the distance from a React component to the database is one file, in a language you already write, with decorators and props you already understand. You do not have to become someone else.

**One codebase is what an agent needs too.** The same architecture that makes you full stack makes the agent full stack. One repo, one prompt, one diff: migration, controller, page, test. The split stack halves what an agent can do for you. The monolith doubles it. Same reason, both times.

---

<!-- .slide: class="center-slide" -->

<div class="one-liner">A full-stack role, on a full-stack monolith.</div>

<p>I believe that is the way forward.</p>

<img class="illustration small" src="/illustrations/notioly/feeling-powerful.svg" alt="">

Note: Say it as a belief, not a fact: I believe. We split the stack for 2012, and we got what we wanted. In 2026 the trade no longer pays. The frontend framework you love can be the V. The backend framework you were wary of turns out to be decorators and return values. And the agent you are unsure about becomes a multiplier instead of a second integration problem.

One codebase, one person, one prompt, one feature. That is the pitch.

---

<!-- .slide: class="center-slide" -->

# Questions?

<p>github.com/ravenberg/nestjs-mvc</p>

<img class="illustration small" src="/illustrations/notioly/faqs.svg" alt="">

Note: Likely questions and the short answers.

**Is this just Inertia?** Yes, the protocol is Inertia, on purpose. nestjs-mvc is the NestJS server adapter plus the client and the things around it that Nest lacked: errors back to forms, flash without sessions, the login redirect, signed links, CSRF.

**Why not AdonisJS, it has an official Inertia adapter?** Adoption. NestJS is the TypeScript backend in the job market and in our company. This gives NestJS the same story.

**Why not Next with server actions?** Rendering framework versus application framework. Where are your queues, your injection, your guards, your scheduled jobs? And Next couples you to one deploy target's way of thinking.

**What about a mobile app?** Build an API for it, in the same NestJS app, next to your pages. Nothing stops you, and an API for a real second client is worth designing.

**SEO?** Server rendering per route with one decorator, @Ssr(). The docs site does it on every page.

**Vue?** Yes, today. **Svelte?** Inertia has a client for it; it is not wired into nestjs-mvc yet.

**Testing?** supertest against controllers like any NestJS app, Playwright against pages. The kitchen sink is tested that way.

**Authentication?** Your guards, unchanged. An UnauthorizedException on a page becomes a redirect to login, and intended() sends people back afterwards.

**Lock-in?** The pages are plain React, the controllers are plain NestJS, and the protocol is open. If you leave, you keep both halves.
