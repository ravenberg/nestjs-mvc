# Slides

Presentation decks as Markdown, served by a nestjs-mvc app and presented with
[Reveal.js](https://revealjs.com).

```sh
pnpm dev          # http://localhost:3002
```

- One deck per file in `content/decks/<slug>.md`. Frontmatter: `title` and
  `description`. The look is one house style in `frontend/deck.css`: Reveal's
  white theme with the docs site's fonts (Inter, Lexend), dark text on white.
- A line with `---` starts a new slide, `--` a vertical slide, `Note:` the
  speaker notes of the current slide. Fenced code is highlighted on the
  server with Shiki (VS Code grammars, One Dark Pro), so TSX, decorators and
  JSX attributes come out as an editor would show them. Add `{|1,9-10|13-17}`
  after the language to step through groups of lines with the arrow key; the
  rest dims. The first group is the starting state, empty means all lines.
- In a deck: `S` opens the speaker view with notes and a timer, `F` full
  screen, `Esc` the overview, `?` all shortcuts. Append `?print-pdf` to the
  URL and print to PDF from the browser.
- Files are read on every request: edit, refresh.
- Slides can mix Markdown and HTML. `deck.css` provides `.split` (text next
  to an image, `.reverse` to swap), `.illustration` (`.small` for a short
  one), `.one-liner` (a highlighted sentence) and `.scatter` (an SVG chart with dashed
  axes and labelled dots); the first deck uses all of them.
- Illustrations go in `content/illustrations/` and are served at
  `/illustrations/<file>` in dev and production alike. An image that is not
  there yet hides itself, so a deck renders before the artwork lands.

The first deck, `nestjs-in-mvc-mode.md`, is a draft of the team introduction
with the talk track in the notes.
