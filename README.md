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
zola build
```

Outputs the static site to `public/` (gitignored). CI runs this on every push.

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds with Zola and deploys `public/` to GitHub
Pages. There is no manual deploy step.

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
