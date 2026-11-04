# Site contract — Zola ⇄ fx.js ⇄ site.js

This is the production Zola site ported from the `design/site/` mockup. The mockup stays
frozen as the design reference; this file is the contract for the real build.

## Files and owners

| file | owner | what |
|---|---|---|
| `config.toml` | site | Zola config (`base_url`, markdown, feeds) |
| `content/**/*.md` | site | page copy, TOML front matter (`title`, `weight`, `[extra]`) |
| `templates/*.html` | site | page shells, per-page `<main>` markup, ledger/meta rendering |
| `templates/partials/fx-settings.html` | site | the embedded `#fx-settings` JSON, verbatim |
| `static/site.css` | site | all styling |
| `static/site.js` | site | `markRoles`, per-page init, router/swap, boot — see below |
| `static/photos.js` | site | Atelier fetch, masonry, filters, EXIF, viewer |
| `static/stats.js` | site | live stats boxes + silent page-view tracking — see below |
| `static/fx.js` | fx | the effects engine (`window.FX`) |
| `static/assets/gold200-grain.png` | — | real Kodak Gold 200 grain tile, 256×256 grey |
| `static/img/projects/<slug>/*` | site | project-body images, referenced from markdown as `/img/projects/<slug>/<file>` |

There is no `content.js` and no `assets/fx-settings.json` in the shipped site: Zola renders
markdown at build time (the old mockup-only JS renderer is gone), and the settings values live
only in `templates/partials/fx-settings.html` (the mockup's `assets/fx-settings.json` was a
tuning-source-of-truth for the mockup only).

## URL map

| URL | content file | template | `<main>` |
|---|---|---|---|
| `/` | `content/_index.md` | `index.html` | `data-page="home" data-crt="full"` |
| `/about/` | `content/about.md` | `about.html` | `data-page="about" data-crt="read"` |
| `/projects/` | `content/projects/_index.md` | `projects.html` | `data-page="projects" data-crt="full"` |
| `/projects/<slug>/` | `content/projects/<slug>.md` | `project.html` | `data-page="project" data-slug=… data-crt="read"` |
| `/photographs/` | `content/photographs/_index.md` | `photographs.html` | `data-page="photographs" data-crt="photos"` |

Only one `<main class="page">` exists in the DOM at a time — there's no `hidden` sibling set
like the mockup; `site.js`'s swapper inserts the new one and removes the old one around the
FX transition.

## Markup contract (templates + site.js produce, fx consumes)

```html
<main class="page" data-page="home|about|projects|project|photographs" data-crt="full|read|photos">
```
- `data-crt`: CRT strength for the page, same mapping as the mockup.
- `data-t` / `data-role` (`structure` | `head` | `body`) / `data-nav` / `data-nosplit` / `data-i`
  / `data-rule` — identical conventions to the mockup (see `design/site/CONTRACT.md` for the
  full description). Static markup (path nav, ledger rows, doc-meta, figures) carries these
  attributes straight from Tera, matching `content.js`'s old `renderLedger`/`renderProjectMeta`
  output byte-for-byte in structure. Markdown bodies (`page.content`) come out of Zola's
  renderer plain — `site.js`'s `markRoles(main)` walks the rendered `<article>`/`.doc` after
  every page load and swap and adds the same attributes `content.js`'s `mdBlocks()` used to
  bake in directly:
  - `h1`/`h2`/`h3` → `data-t data-role="head"` (and strips the `id` Zola's renderer adds —
    the mockup's renderer never added one, and DOM parity cares about that).
  - `p`, `li`, `blockquote`, `th`, `td` → `data-t data-role="body"`.
  - `pre` → `data-t data-role="body" data-nosplit`; strips the `data-lang` Zola puts on
    `<code>` for a fenced block's language hint (the mockup's renderer never kept it).
  - `hr` → replaced with `<div class="rule" data-rule></div>` (Zola's renderer emits `<hr>`
    for `---`; the mockup's own renderer emitted the div directly).
  - images inside `.doc`/`article` → `data-i`.
  - an `![alt](src)` line directly followed by an italic `*caption*` line (no blank line
    between — a CommonMark soft break, not a new paragraph) comes out of Zola's markdown
    renderer as a single `<p><img src="…">\n<em>caption</em></p>`, whereas the mockup's own
    renderer (`content.js`'s `mdBlocks()`, same source pattern) baked the pair directly into
    `<figure><img data-i>+<figcaption data-t data-role="body">`. `markRoles` detects a `<p>`
    whose only non-whitespace children are one `<img>` followed by one `<em>` and rebuilds it
    into that exact figure markup, then calls `FX.develop(img)` on the image so it takes part
    in the interlaced photo reveal (`photoReveal` setting) the same way `photos.js`'s masonry
    tiles do. Project images live in `static/img/projects/<slug>/`; markdown references them as
    `/img/projects/<slug>/<file>`.
- The sticky path line on inner pages is still `<nav class="path" data-t data-role="structure" data-nav>`.

## site.js — routing, prefetch, swap

`site.js` replaces `index.html`'s inline router + boot script entirely. It:

- Runs `markRoles` + the per-page init (`initPage`, keyed off `data-page`) on first load, then
  the exact `FX.init` → `coldStart`/`show` → fx-boot-removal sequence the mockup used.
- Intercepts clicks on same-origin `<a href>` elements with no `target`/`download`, no
  modifier key held and not a middle click, that aren't a pure same-page hash change (the
  `/photographs/#<id>` viewer deep link, or any other `#`-only link such as the "view as .md"
  toggle), and whose last path segment has no extension or ends in `.html`. Everything else —
  external links, `mailto:`, the photo viewer's own `#` links, non-HTML files — passes through
  untouched.
- `navigate(url, {push})`: fetches the target (or reuses the prefetch cache — a `Map` of
  `path+search → Promise<{doc, main}>`, capped at 20 entries), clones and adopts its
  `main.page`, then calls `FX.transition(oldMain, newMain, swap)`. `swap` inserts `newMain`
  after `oldMain`, runs `markRoles(newMain)`, copies `<title>`/meta description/OG tags from
  the fetched document, updates history, resets or restores scroll, and `await`s `initPage`
  (the photographs page's masonry fetch happens here, same as the old router's `preparePage`).
  `oldMain` is removed once the transition resolves. FX never touches routing or `hidden`,
  exactly as the mockup's contract requires. A failed fetch or a response with no `main.page`
  falls back to `location.href = url` (hard navigation).
- Prefetches on `pointerenter`/`focus`/`touchstart` of internal links, plus one
  `IntersectionObserver` for internal links scrolled into view, each firing the same cached
  fetch at most once.
- `history.scrollRestoration = 'manual'`. The current entry's `state.scrollY` is kept live via
  a throttled `scroll` listener (there's no reliable "about to leave" hook for the browser's
  own back/forward buttons), so a `popstate` can restore it after the swap. A `popstate` whose
  path+search didn't change (a hash-only change on `/photographs/`) is left to `photos.js`.
- In `FX.lite` (or the fx stub), `FX.transition` is still the call site.js makes — it's just a
  150 ms fade instead of the full effect, per the mockup's contract.

## Photo viewer deep links

The mockup used `#/photographs/<id>` as a hash *route*. On the real site `/photographs/` is
itself the route; a deep link to one frame is just the hash on that page: `/photographs/#<id>`.
`photos.js`'s `openViewer`/`closeViewer` write `history.replaceState` accordingly, and the
route is resolved by `site.js`'s `initPage`/`onPopState` reading `location.hash` directly —
never by the router (`site.js` never parses the hash as a route itself, only as this one
viewer deep link, matching the mockup's own rule of "the hash is for the router, not an app
state dumping ground" — except here the hash *is* the state for this one case).

## FX API (fx.js provides, site calls)

Unchanged from the mockup — same `window.FX` surface (`lite`, `init`, `show`, `coldStart`,
`transition`, `refresh`, `develop`, `frame`, `powerOff`). See `design/site/CONTRACT.md` for the
full signatures; `static/fx.js` is the mockup's `fx.js` byte-for-byte except the grain texture
(see below).

## Grain texture

`static/fx.js`'s `GOLD200` constant is `'/assets/gold200-grain.png'` (loaded via `<img>`/
`texImage2D`, same-origin) instead of the mockup's inlined base64 data URI — the mockup had to
inline it to work from `file://`; the real site doesn't. The texture-load failure path
(`gim.onerror = resolve()`, never blocking `FX.init` on a bad texture) is unchanged.

## Photos: loading (photos.js owns it, fx.js only reveals)

Unchanged from the mockup — see `design/site/CONTRACT.md`'s "Photos: loading" section in full.
The only edit to `static/photos.js` versus the mockup is the hash format above.

### photoReveal setting

Unchanged — `photoReveal` lives in `fx.js`'s `SCHEMA_DEFAULTS` and, kept in sync,
`templates/partials/fx-settings.html`'s embedded JSON.

### Dev-only query params

Unchanged (`?reveal=`, `?slow=`) — see `design/site/CONTRACT.md`.

## Live stats + page-view tracking (static/stats.js)

Ported from the old SPA's `assets/js/firebase-config.js` (`renderAtelierStats`,
`renderOurArchiveStats`, `renderBifrostStats`, `trackPageView`) — same backends, same payloads,
restyled to the house ledger look (no Tailwind cards). `window.Stats = { render, track }`:

- `Stats.render(mainEl)` — fills any of the three live-stats slots (`#atelier-live-stats`,
  `#bifrost-live-stats`, `#ourarchive-live-stats`) present in `mainEl` with a ledger-style
  `<dl>` (`dt`/`dd` rows, `dd` carrying `data-t data-role="body"`), then calls `FX.refresh(mainEl)`
  once. Atelier and OurArchive data comes from Firestore REST (no SDK, like `photos.js`) —
  Atelier from the `atelier-cms` project (`portfolio_collections`/`portfolio_photos` counts +
  latest upload), OurArchive from the `ourarchive-7d7ba` project's `public_stats/ourarchive`
  doc. Bifrost reads `public_stats/bifrost` from the `atelier-cms` project — same Firestore
  project `photos.js` already uses, not an HTTP endpoint (the old code's "Live from Bifrost"
  label refers to what writes the doc, not how this site reads it). Any failure (offline,
  blocked, missing doc) leaves the slot empty — no thrown errors. `site.js` calls this from
  `initPage` for every `data-page="project"` page, first load and after every swap; it's a
  no-op for projects with no slot.
- `Stats.track(pageId)` — fire-and-forget: posts to the same Bifrost function the old site used
  (`invokeBifrostAsync`, function id `track-page-view`, public key unchanged), plus, once per
  browser session, a `track-visit` call with device/referrer/geo (same session-storage gating,
  same `ip-api.com` geolocation lookup, as the old `trackPageView`). Never throws, never blocks
  navigation. `site.js` calls this on first load (`boot()`) and after every successful
  `navigate()`, with a page id computed from the new `main`'s `data-page`/`data-slug` —
  IDENTICAL to the old router.js ids so analytics history stays continuous:

  | URL | old id | id `pageIdFor` computes |
  |---|---|---|
  | `/` | `front` | `front` |
  | `/about/` | `about` | `about` |
  | `/projects/` | `projects` | `projects` |
  | `/projects/<slug>/` | `projects_<slug>` | `projects_<slug>` |
  | `/photographs/` | `photos` | `photos` |

## Layering (z-index)

Unchanged — see `design/site/CONTRACT.md`.

## Hard-won rules (do not regress)

Unchanged — see `design/site/CONTRACT.md`. All of it still applies verbatim since `fx.js` is
unmodified besides the grain texture swap above.
