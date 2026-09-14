---
title: How it works
---

You can use nestjs-mvc without reading this page. It is here for when you are curious, or when you debug something in the network tab. {% .lead %}

## The first visit

The browser asks for `/users`. Your controller returns `{ users: [...] }`. nestjs-mvc sends back a full HTML page with three things in it:

* your scripts and styles,
* the page name and the props, as JSON in a `<script>` tag,
* an empty element where React renders the page.

React reads the JSON, finds `frontend/pages/Users/Index.tsx` and renders it.

## Every visit after that

A click on a `Link` does not load a new HTML page. The browser asks for `/users/1` with an extra header that says "I only need the data".

The same controller runs. nestjs-mvc answers with just the JSON:

```json
{
  "component": "Users/Show",
  "props": { "user": { "id": 1, "name": "Ada" } },
  "url": "/users/1",
  "version": "a1b2c3"
}
```

The browser swaps the page and updates the URL. Your layout stays where it is.

## Forms

A form sends a normal `POST`. Your controller saves and redirects. The browser follows the redirect as a visit and renders the page it lands on.

When validation fails, nestjs-mvc redirects back to the form and puts the errors in a signed cookie. The next render reads that cookie and adds the errors to the props. That is how `form.errors` gets filled without any code in your controller.

## Loading less

On a reload with `only: ['stats']`, the browser tells the server which props it wants. nestjs-mvc skips the other props without calling their functions. `defer()`, `optional()`, `once()` and `merge()` all build on this.

## After a deploy

Every page carries a `version`. When a tab with an old version asks for data, nestjs-mvc answers "reload" and the browser does a full page load to get the new code.

## Nothing is kept on the server

NestJS serves all users from one process. So nestjs-mvc keeps no state between requests: flash messages and errors travel in signed cookies, cached data lives in the browser. There is no session to set up, and no way for one user's data to leak to another.

## The protocol

The browser and the server talk using a small open protocol called [Inertia](https://inertiajs.com). nestjs-mvc implements the server side of it for NestJS, and ships the React side as `nestjs-mvc/react`. You do not need to learn Inertia to use nestjs-mvc: everything is explained in these docs.
