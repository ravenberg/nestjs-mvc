---
title: Acknowledgements
---

nestjs-mvc stands on the shoulders of a few wonderful projects. This page is here to thank them, and to show you what each one does for your app. {% .lead %}

## NestJS

Your app is a NestJS app, and it stays one. Modules, controllers, guards, pipes and dependency injection all come from [NestJS](https://nestjs.com), created by Kamil Myśliwiec and built by a large community. nestjs-mvc only adds a way for your controllers to answer with pages.

## Inertia

The way the browser and your server talk to each other comes from [Inertia](https://inertiajs.com). It was created by Jonathan Reinink and is now looked after by the Laravel team.

Inertia has two halves. The browser half is what makes links and forms feel like a single page app, and nestjs-mvc ships it to you as {% framework name="react" %}`nestjs-mvc/react`{% /framework %}{% framework name="vue" %}`nestjs-mvc/vue`{% /framework %}. That's why an `@inertiajs` package shows up in your `package.json`. The server half is what nestjs-mvc itself is: it speaks the same protocol, written for NestJS.

You never have to learn Inertia to use nestjs-mvc. Everything you need is in these docs. But if you ever read the Inertia docs, a lot will look familiar, and that's no accident.

## Laravel

Many ideas in nestjs-mvc were first shaped in [Laravel](https://laravel.com): sending a form back with its errors, flash messages that live for exactly one request, signed links, and checking a form while you type. Laravel showed how pleasant a full stack framework can feel, and nestjs-mvc tries to bring that feeling to NestJS.

## React, Vue and Vite

Your pages are [React](https://react.dev) or [Vue](https://vuejs.org) components, and [Vite](https://vite.dev) builds them. While you develop, Vite runs inside your Nest app, which is why you only start one process. Vite also builds the version of your pages that runs on the server, when you turn on [server rendering](/docs/server-rendering).

## Built on top

Some things your app needs sit around those projects rather than inside them. nestjs-mvc takes care of them for you:

* **Logging in.** A guest who opens a protected page goes to your login page, and comes back to that page afterwards. See [Authentication](/docs/authentication).
* **Protection against forged requests.** Every form is protected without any setup. See [CSRF protection](/docs/csrf).
* **Signed links.** Links that prove where they came from, without a table of tokens. See [Signed links](/docs/signed-urls).
* **No session store.** Flash messages and form errors travel in signed cookies, so there's nothing to set up on the server.
* **Error pages.** Your own pages for a 404 or a 500, rendered like any other page. See [Error pages](/docs/error-pages).

More will follow, always with the same aim: that a NestJS developer can build a complete app without leaving NestJS.

## These docs

This site is a nestjs-mvc app itself. The pages are written in [Markdoc](https://markdoc.dev), and the design is based on the Syntax template from [Tailwind Plus](https://tailwindcss.com/plus).

Thank you to everyone who works on these projects.
