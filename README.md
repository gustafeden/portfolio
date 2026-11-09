# gustaf edén — portfolio

Personal site: photographs and project write-ups. Built with [Zola](https://www.getzola.org/)
(static site generator, Rust/Tera templates), a hand-rolled CRT/phosphor effects layer
(`static/fx.js`), and a small client-side page swapper (`static/site.js`) so navigation feels
instant without a JS framework.

## Develop

```
zola serve
```

Serves on `127.0.0.1:1111` with live reload.

## Build

```
npm ci
npm run build
```

Outputs the static site to `public/` (gitignored). Zola builds the pages, then a pinned
esbuild minifies the shipped JS and CSS in that directory only. `static/` remains readable;
`zola serve` serves those sources without requiring Node. `npm run check` checks syntax.

The FX canvas uses at most 750,000 pixels and DPR 1; grain is generated locally with no
texture request. Reading-page transitions group body blocks while preserving word-level
resting phosphor styling. Motion reduction and missing WebGL keep content readable.

Compare transfer sizes using the same gzip/Brotli settings for both builds, including
`fx.css` in the optimized FX total and the former grain image in the original total.

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds with Zola and deploys `public/` to GitHub
Pages, using `npm ci` and `npm run build`. There is no manual deploy step.

## Photos

The photographs page and the live stats boxes on some project pages pull from Firestore at
runtime (no build-time data, no SDK — plain REST calls). Photos are managed through
[Atelier](https://github.com/gustafeden/atelier), a phone app that writes directly to the same
Firestore project this site reads from: upload a photo in the app, it's live on the site with no
rebuild or deploy. See `static/photos.js` (photos) and `static/stats.js` (live stats + page-view
tracking).

## Contract

`CONTRACT.md` is the source of truth for how templates, `site.js`, `fx.js`, `photos.js` and
`stats.js` fit together — read it before touching any of them.
