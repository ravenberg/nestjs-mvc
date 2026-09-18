---
title: Authorization
---

[Authentication](/docs/authentication) tells you who someone is. Authorization decides what they may do: who can open the people page, who can declare an incident, who can edit a note. {% .lead %}

## Roles on a route

Most apps start with roles. Put the roles a route needs on it with a decorator:

```ts
// src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common'

export type Role = 'admin' | 'responder' | 'viewer'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
```

Then check them in the guard you already have, right after it knows who the user is:

```ts
// src/auth/auth.guard.ts
async canActivate(context: ExecutionContext) {
  const req = context.switchToHttp().getRequest()
  const token = readCookie(req, 'access_token')
  const payload = token ? await this.jwt.verifyAsync(token).catch(() => null) : null
  req.user = payload ? await this.users.findOne(payload.sub) : undefined

  const targets = [context.getHandler(), context.getClass()]
  if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true
  if (!req.user) throw new UnauthorizedException()

  const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets)
  if (roles && !roles.includes(req.user.role)) {
    throw new ForbiddenException(`This needs the ${roles.join(' or ')} role.`)
  }
  return true
}
```

Now a whole controller can be for admins only, or a single handler for some roles:

```ts
@Controller('people')
@Roles('admin')
export class PeopleController {
  // every route in here is for admins
}

@Controller('incidents')
export class IncidentsController {
  @Post()
  @Roles('admin', 'responder')
  declare(@Body() dto: DeclareIncidentDto) {
    // ...
  }
}
```

A `@Roles()` on a handler replaces the one on its controller, so a handler can open up or narrow down what the controller says.

The two refusals are different on purpose. A guest gets a `401`, which sends them to the login page. A user who is logged in but has the wrong role gets a `403`: logging in again wouldn't help them, so there's no point sending them there.

## What the user sees when refused

Out of the box, a `403` is NestJS's JSON error, which isn't something you want to show anyone. Give it a page with [error pages](/docs/error-pages), and pass the message along so the user knows why:

```ts
MvcModule.forRoot({
  vite: {},
  errorPages: ({ status, exception }) => {
    if (status === 403) {
      return { component: 'Error', props: { status, reason: (exception as Error).message }, shared: true }
    }
    if ([404, 500, 503].includes(status)) {
      return { component: 'Error', props: { status }, shared: true }
    }
  },
})
```

Show `reason` under the title of your error page, and someone who opens `/people` without being an admin sees "This needs the admin role." inside your layout. Because the message reaches the user, write the text of a `ForbiddenException` for them: say what they can do about it, like "Ask an admin to change your role."

## Only show what they can use

Nobody likes a button that leads to "you can't do that". Tell every page what the user may do, and let the page leave out the rest. Share it next to the user, from your [shared data](/docs/shared-data) middleware:

```ts
// src/shared-data.middleware.ts
@Injectable()
export class SharedDataMiddleware implements NestMiddleware {
  use(req: AnyRequest & { user?: User }, res: unknown, next: () => void) {
    requestState(req).shared.auth = {
      can: () => ({
        declareIncident: req.user?.role === 'admin' || req.user?.role === 'responder',
        managePeople: req.user?.role === 'admin',
      }),
    }
    next()
  }
}
```

`can` is a function because middleware runs before your guard, so `req.user` isn't there yet. The function runs when the page renders, after the guard. nestjs-mvc adds the user to your `auth` object, so every page gets `auth.user` and `auth.can`:

{% framework-code %}
```tsx
import { Link, usePage } from 'nestjs-mvc/react'

type Auth = { user: { name: string }; can: { declareIncident: boolean; managePeople: boolean } }

export function Menu() {
  const { props } = usePage<{ auth: Auth }>()

  return (
    <nav>
      <Link href="/incidents">Incidents</Link>
      {props.auth.can.managePeople && <Link href="/people">People</Link>}
      {props.auth.can.declareIncident && <Link href="/incidents/create">Declare incident</Link>}
    </nav>
  )
}
```

```vue
<script setup lang="ts">
import { Link, usePage } from 'nestjs-mvc/vue'

type Auth = { user: { name: string }; can: { declareIncident: boolean; managePeople: boolean } }

const page = usePage<{ auth: Auth }>()
</script>

<template>
  <nav>
    <Link href="/incidents">Incidents</Link>
    <Link v-if="page.props.auth.can.managePeople" href="/people">People</Link>
    <Link v-if="page.props.auth.can.declareIncident" href="/incidents/create">Declare incident</Link>
  </nav>
</template>
```
{% /framework-code %}

## Hiding a button protects nothing

The page runs in the user's browser, and anyone can send a request to `/people` without clicking your link. Hiding the button is there so the page makes sense; the `@Roles()` on the route is what keeps people out. Every action needs its check on the server, whether or not a page offers it.

That's also why it helps to keep each rule in one place. When the guard and `can` both ask "is this an admin?", a change to one is easy to forget in the other, and then the page offers a button the server refuses (or hides one it would allow).

## Records they may not see

Some rules aren't about the route but about the record. Say an incident can be private: only admins, the person who reported it and its lead may see it. `canSee()` says that for one incident, and `visibleWhere()` says it for a query, so everyone else never finds it in a list:

```ts
// src/incidents/incidents.service.ts
export const canSee = (incident: Incident, user: User) =>
  !incident.isPrivate || user.role === 'admin' || incident.reporter.id === user.id || incident.lead?.id === user.id

export function visibleWhere(user: User, where: FindOptionsWhere<Incident> = {}) {
  if (user.role === 'admin') return where
  return [
    { ...where, isPrivate: false },
    { ...where, reporter: { id: user.id } },
    { ...where, lead: { id: user.id } },
  ]
}

// in the controller
const incidents = await this.repository.find({ where: visibleWhere(user, { status: 'open' }) })
```

Filtering in the query, rather than after it, keeps counts and pages right, and a private incident never gets near the page's props.

Opening one by its URL needs the same rule. Answer with a `404`, not a `403`:

```ts
async find(id: number, user: User) {
  const incident = await this.incidents.findOne({ where: { id }, relations: { reporter: true, lead: true } })
  if (!incident || !canSee(incident, user)) {
    throw new NotFoundException(`There is no incident INC-${id}.`)
  }
  return incident
}
```

A `403` would say "this exists, but it's not for you", and sometimes that's already too much. Someone trying `/incidents/41`, `/incidents/42` and so on would learn which private incidents there are. With a `404`, a private incident looks exactly like one that doesn't exist.

Pages with private records are also worth keeping out of the browser's history after logging out. [Private history](/docs/history-encryption) shows how.

## Only the author may edit

Other rules depend on who the user is to that record. Anyone who can see a note may read it, but only its author, or an admin, may change it. That check goes in the handler (or the service it calls), after loading the record. `@CurrentUser()` here is a small param decorator that returns `req.user`:

```ts
// src/notes/notes.controller.ts
const canEdit = (note: Note, user: User) => user.role === 'admin' || note.author.id === user.id

@Patch(':id')
async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNoteDto, @CurrentUser() user: User) {
  const note = await this.notes.find(id, user)
  if (!canEdit(note, user)) {
    throw new ForbiddenException('Only the author or an admin can edit this note.')
  }
  await this.notes.update(note, dto)
  return this.view.back()
}
```

Here a `403` is right: the user can see the note, they just can't change it. `notes.find()` still answers `404` for a note they may not see at all.

To show the Edit button only where it works, send the same rule along with each record:

```ts
notes: notes.map((note) => ({ id: note.id, body: note.body, can: { edit: canEdit(note, user) } }))
```

## In detail

### Refused while submitting a form

When the `403` comes from a form, your error page replaces the page with the form on it. If you'd rather keep the user where they were, send them back with a message for everything that isn't a `GET`:

```ts
errorPages: ({ status, exception, request }) => {
  if (status === 403 && request.method !== 'GET') {
    return { redirect: 'back', flash: { message: (exception as Error).message } }
  }
  // ...
}
```

Show the message the way you show your other [flash messages](/docs/flash-messages).

### When can is up to date

Shared data is worked out on every page visit, so after an admin changes someone's role, that person's next click shows the right buttons. A reload of only some props leaves shared data out, and the page keeps the `can` it had until the next visit. The server check doesn't wait for that: it runs on every request.
