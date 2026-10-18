# 🏄🏽‍♀️ [ido-green.appspot.com](https://Ido-green.appspot.com)

My projects, demos and other fun stuff

## Tech Stack 🏔️

- **Static site on Google App Engine** (`php83` runtime). `ido-green/app.yaml`
  serves `ido-green/www/` as static files; the only PHP is `not-found.php`,
  which returns the custom 404 page with a real 404 status.
- **Homepage**: hand-written HTML, `css/main.css` and vanilla `js/main.js`, with
  Inter / Outfit from Google Fonts. No framework and no build step beyond the
  two small Node scripts in `ido-green/tools/`.
- **Latest Writing**: `main.js` pulls recent posts from the public WordPress.com
  API for [greenido.wordpress.com](https://greenido.wordpress.com).
- **Tests**: Jest + Puppeteer smoke tests against a local static server, run on
  every push and PR by [GitHub Actions](https://github.com/greenido/ido-green.appspot.com/actions)
  (`.github/workflows/tests.yml`).
- The older demos under `www/` (RoadShow, bots, clock, pull-ups, ...) keep
  their own libraries (Bootstrap, jQuery, Font Awesome) and are left as they were.

## Layout 🗂️

```
ido-green/
  app.yaml          App Engine handlers and cache headers
  not-found.php     404 front controller for unmatched URLs
  www/              the public web root (everything here is served)
    data/projects.json   source of the homepage project cards
  tools/            build-projects.js, version-assets.js, make-og-card.js
  tests/            Jest + Puppeteer suite and its static server
  docs/             notes that must not be served
```

## Adding or Editing a Project 🧩

The project cards on the homepage are generated from `ido-green/www/data/projects.json`.
**Do not hand-edit the cards in `index.html`** - anything between the
`PROJECTS:START` / `PROJECTS:END` markers is overwritten.

```bash
# 1. edit ido-green/www/data/projects.json
# 2. regenerate the markup
node ido-green/tools/build-projects.js
```

Each entry takes `id`, `title`, `description`, `icon`, `category`, `url`, `cta`,
an optional `repo` (`owner/name` - adds a Source link and a live star count),
and `tags` (searchable, but not displayed).

Rendering happens at build time so the projects are in the served HTML for
crawlers and no-JS visitors; the search and category filter are layered on top.
A test fails if `index.html` is out of date with the JSON, so CI catches a
forgotten rebuild.

## The Hidden Climb 🏔️

There is an easter egg on the homepage: a small canvas game called **Everesting**,
where you climb 8,848m without hitting the rock.

Two ways in:

- Type `8848` into the project search box (works on a phone).
- Type `8848` anywhere on the page with no field focused (desktop keyboard).

One secret, two ways in. It replaced a ten-key Konami sequence: a single short
secret is easier to remember, and easier to hint at, than two different ones.

`www/js/easter-egg.js` is **not** part of a normal page load. It is fetched only
when a trigger fires, so the homepage pays nothing for it. The game renders into
a modal `<dialog>` over the page rather than its own URL, which keeps it out of
the sitemap and out of Google. Best altitude is kept in `localStorage`.

A failed project search hints at it, and `main.js` logs a nudge to the console -
otherwise nobody would ever find it.

Two things to know if you touch it:

- **Canvas `ctx.font` cannot parse CSS `var()`.** A font string containing one
  is rejected whole and silently falls back to 10px sans-serif. Use the literal
  family names in `DISPLAY_FONT` / `BODY_FONT`.
- **A `<dialog>` defaults to `position: absolute`**, which on a long page parks
  it against the document instead of the viewport. It is pinned `fixed`.

Run the tests before shipping a change to it - and stop any preview server on
port 8080 first, or `jest-puppeteer` blocks on an interactive prompt:

```bash
lsof -ti:8080 | xargs kill -9; cd ido-green/tests && npm test
```

## Everything Under `www/` Is Public 🔓

`app.yaml` serves `ido-green/www` as the web root, so anything dropped there is
a live 200 - build config included. Docs live in `ido-green/docs/` for that
reason, and `tests/assets.test.js` fails the build if a `package.json`,
`Gruntfile.js`, `.env` or stray `.md` reappears under `www/`.

The same test file also guards two things that are easy to regress:

- **No React development builds.** They carry the warning apparatus and cost
  about 210KB more than the production ones.
- **Every third-party script is version-pinned.** `@latest` and bare package
  paths let a CDN change what the page runs between two visits.

## Asset Versioning ⚠️

`app.yaml` caches `/css/` and `/js/` for **seven days**, so an unversioned asset
URL cannot be updated by a deploy. Worse, the edge keys on
`Vary: Accept-Encoding`, so it goes stale *per encoding variant* - a deploy can
look live to `curl` while every Chrome visitor still runs the old file, because
Chrome is the only client sending `zstd`. That is exactly how the easter egg
shipped and stayed dead.

`tools/version-assets.js` stamps a content hash onto every local css/js
reference. A hashed URL has never been cached, so a deploy lands immediately and
the seven day cache stays a benefit.

**Run it after any change to `www/css/` or `www/js/`:**

```bash
node ido-green/tools/build-projects.js && node ido-green/tools/version-assets.js
```

`tests/assets.test.js` fails if any stamp has drifted from its file, so a
forgotten run cannot reach production.

## Local Development 💻

```bash
cd ido-green/tests
npm ci          # once
npm run serve   # serves ido-green/www on http://localhost:8080
npm test        # starts its own server on 8080, so stop `serve` first
```

## Deploy 🚀

Deploys are manual. From the repo root: run the build scripts, run the tests,
then deploy:

```bash
node ido-green/tools/build-projects.js && node ido-green/tools/version-assets.js
(cd ido-green/tests && npm test)
gcloud app deploy ido-green/app.yaml --project theProjectID --quiet
```

`gcloud app versions list` confirms the new version is serving.

## Bugs and Issues 🚨

Found a bug or an issue? [Open a new issue](https://github.com/greenido/ido-green.appspot.com/issues) here on GitHub.

## ToDos 🐅

- 'Playroom' for the examples on the [RoadShow page](https://ido-green.appspot.com/RoadShow.html)
- ServiceWorker - use it to improve performance and to control the fetching of new / fresh content (e.g. blog posts)
