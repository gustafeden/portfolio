# Site contract — Zola ⇄ fx.js ⇄ site.js

## Source and build

| File | Responsibility |
|---|---|
| `config.toml`, `content/**/*.md` | Zola configuration, copy and front matter |
| `templates/*.html` | Page shells, ledger/meta rendering and photo viewer |
| `static/site.css` | Page styling |
| `static/fx.css` | Effects styling, loaded after `site.css` |
| `static/fx.js` | `window.FX` engine and the single `FX_PRESET` configuration |
| `static/site.js` | Markdown roles, per-page initialization, router and prefetch |
| `static/photos.js` | Firestore photos, masonry, filters, EXIF and viewer |
| `static/stats.js` | Live project statistics and silent page-view tracking |
| `static/img/projects/<slug>/*` | Images referenced by project markdown |
| `scripts/minify.mjs` | Minifies generated JS/CSS after Zola builds |

`zola serve` uses readable sources directly. Production uses `npm ci` followed by
`npm run build`: Zola renders `public/`, then pinned esbuild minifies only generated
JS/CSS there. `public/` and `node_modules/` are ignored. CI deploys that output.
Settings are neither embedded in HTML nor fetched separately. `FX.init()` uses
`FX_PRESET`; there is no second schema/defaults table. Grain is a seeded procedural
256×256 luminance texture, uploaded locally without an image request.

## Pages and markup

| URL | Template | Main attributes |
|---|---|---|
| `/` | `index.html` | `data-page="home" data-crt="full"` |
| `/about/` | `about.html` | `data-page="about" data-crt="read"` |
| `/projects/` | `projects.html` | `data-page="projects" data-crt="full"` |
| `/projects/<slug>/` | `project.html` | `data-page="project" data-slug=… data-crt="read"` |
| `/photographs/` | `photographs.html` | `data-page="photographs" data-crt="photos"` |

There is one `main.page` after each navigation. During a swap the outgoing main is
hidden, then removed after the transition. Templates mark structure with `data-t`,
`data-role="structure"`, `data-nav`, `data-rule` and `data-nosplit` as appropriate.

`markRoles(main)` annotates rendered markdown on initial load and every swap:

- `h1`/`h2`/`h3`: `data-t data-role="head"`, without heading IDs.
- `p`, `li`, `blockquote`, `th`, `td`: `data-t data-role="body"`.
- `pre`: body role plus `data-nosplit`; removes fenced-code `data-lang`.
- `hr`: replaced by `div.rule[data-rule]`, split into 28 FX segments.
- Article/doc images: `data-i`. A paragraph containing only an image and italic
  caption becomes `figure.side` with a body-role `figcaption`; `FX.develop` reveals
  its image. Atelier's project page also inserts two live photos if available.

Word spans (`.u`) retain resting phosphor ink, glow and link hover styling.
Reading-page transitions group ordinary body blocks, leaving headings, navigation,
rules, images and unsplit blocks as separate units. Geometry and ink reads are
batched before style writes; scroll updates geometry without re-sampling FX ink.

## Initialization and routing

Content is visible without JavaScript; there is no body visibility gate. After
fonts are ready, `site.js` calls `FX.init()`, marks the initial main, awaits per-page
initialization, tracks the page, and calls `FX.reveal(main)` for the normal incoming
640 ms effect. There are no tube startup or power-switch APIs or controls.

The router intercepts unmodified primary clicks on same-origin links without
`target`/`download`, except same-page hash changes and non-HTML file links.
`navigate` fetches/clones the next `main.page` and calls `FX.transition(from, to,
swap)`. The swap updates title/description/OG metadata, history and scroll, marks
roles, and awaits page initialization. Failed HTML fetches use hard navigation.
Rapid requests are serialized, retaining the latest pending destination.

The HTML prefetch cache holds at most 20 path+search promises, evicts failed
requests, and fills on pointer/focus/touch hints and visible links. History uses
manual scroll restoration and a throttled saved scroll position. Photo hashes
(`/photographs/#<id>`) belong to the viewer; hash-only history changes do not swap
pages. Project pages retain the rendered/raw markdown toggle.

## FX surface and invariants

`window.FX` exposes `lite`, `init()`, `show(main)`, `reveal(main)`,
`transition(from, to, swap)`, `refresh(main)`, `develop(img)`, and `frame(img, src)`.
`_debugFreeze(ms)` supports fixed-time transition inspection.

- Full transitions use 350 ms outgoing, zero hold, and 640 ms incoming phases,
  preserving easing, ordering, jitter, chroma, scan, glow and photo reveal timings.
- Rendering pauses while the asynchronous swap initializes data, then restarts
  the incoming clock. The FX animation loop runs only while effects are active.
- Canvas DPR is at most 1, with at most 750,000 backing pixels. Coordinates remain
  in CSS pixels. Low memory/CPU/network hints do not disable full effects.
- Reduced motion uses immediate navigation/reveal. Missing WebGL uses the preset
  fade durations, visible rules and CRT glass. Missing `fx.js` uses a minimal stub
  installed after the FX script, keeping content and navigation available.
- Ink measurement suppresses hover and resets FX styles before sampling colors.
  Resting read-page bodies use `crtRead = 0.25`; navigation uses `crtNav = 1`.
- Images under active photo development are excluded from page FX until reveal
  completion. Tile frames reserve geometry; project image loads remeasure it.
- `photoReveal` defaults to `interlaced`; `?reveal=interlaced|darkroom|grain`
  overrides it. `photos.js` also supports `?slow=` for loading inspection.
- FX canvas is at z-index 60, page CRT glass at 6, clean photos at 7, viewer glass
  at 3 within the viewer. All glass/canvas layers ignore pointer events.

## Runtime data

`photos.js` owns loading and source URLs; FX only reveals decoded images. Photos
and collections use Firestore REST in `atelier-cms`. Viewer links use the original
photo source, with arrow keys, Escape and phone swipe controls.

`Stats.render(main)` fills project ledger slots from Firestore, then calls
`FX.refresh(main)`. Atelier and Bifrost use `atelier-cms`; OurArchive uses
`ourarchive-7d7ba`. Data failures leave slots empty without blocking navigation.
`Stats.track(id)` is fire-and-forget, retaining the existing Bifrost payloads,
visit session gating and geolocation lookup. Persisted page IDs are `front`,
`about`, `projects`, `projects_<slug>`, and `photos`.
