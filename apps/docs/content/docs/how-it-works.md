---
title: How it works
---

You can use nestjs-mvc without ever reading this page. It's for when you're curious, or when you're debugging something in the network tab. {% .lead %}

## The first visit

The browser asks for `/users` and your controller returns `{ users: [...] }`. nestjs-mvc then sends back a full HTML page that has:

* your scripts and styles,
* the page name and the props, as JSON in a `<script>` tag,
* an empty element where React renders the page.

React reads the JSON, finds `frontend/pages/Users/Index.tsx` and renders it.

## Every visit after that

When someone clicks a `Link`, the browser asks for `/users/1` with an extra header that says it only needs the data.

The same controller runs, and nestjs-mvc answers with only the JSON:

```json
{
  "component": "Users/Show",
  "props": { "user": { "id": 1, "name": "Ada" } },
  "url": "/users/1",
  "version": "a1b2c3"
}
```

The browser swaps the page and updates the URL, and your layout stays where it is.

## Forms

A form sends a normal `POST`, and your controller saves and redirects. The browser follows the redirect like any other visit and renders the page it lands on.

When validation fails, nestjs-mvc redirects back to the form and puts the errors in a signed cookie. The next render reads that cookie and adds the errors to the props, which is how `form.errors` fills up without any code in your controller.

## Loading less

On a reload with `only: ['stats']`, the browser tells the server which props it wants, and nestjs-mvc skips the others without calling their functions. `defer()`, `optional()`, `once()` and `merge()` are all built on that.

## After a deploy

Every page carries a `version`. When a tab that's still on an old version asks for data, nestjs-mvc tells it to reload, and the browser does a full page load to get the new code.

## State stays out of the server

NestJS serves all your users from one process, so nestjs-mvc doesn't keep anything between requests. Flash messages and errors travel in signed cookies, and cached data lives in the browser. That way you have no session to set up, and one user's data can't leak to another.

## The protocol

The browser and the server talk through a small open protocol called [Inertia](https://inertiajs.com). nestjs-mvc implements the server side of it for NestJS and ships the React side as `nestjs-mvc/react`. Everything you need is in these docs, so you won't have to learn Inertia itself.
