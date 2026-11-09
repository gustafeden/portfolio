# Faithful portfolio clone

Preview: **http://127.0.0.1:18766/**

This is a faithful static clone with readable sources and a compact generated preview. It includes Home, About, Projects, all four project detail pages, and the live Photographs gallery. There are no mockup controls. Red Hat Mono and Red Hat Text load through the original Google Fonts stylesheet. Photographs, collections, EXIF, project screenshots, live stats and tracking use the original code and endpoints.

## Source and freshness

The clone was copied from the production Zola output on 2026-11-09. Regenerate the production comparison fixture with `npm run test:setup` (requires Zola). It builds the repository's current templates and content into gitignored `verification/original/`; that fixture is never shipped in the preview or committed.

## Sources and generated preview

- `src/fx.js`: formatted effects engine, including named multiline `VERTEX_SHADER` and `FRAGMENT_SHADER` constants. Shader math is preserved.
- `src/site.js`: formatted page initialization, routing and prefetch. `initializeSite()` performs the normal incoming reveal.
- `src/fx.css`: extracted effects stylesheet. Each HTML page links `/site.css` then `/fx.css`, before runtime scripts. Rule order, specificity, vendor declarations and `[data-fx-glass]` vignette/bezel behavior are preserved.
- `site.css`, `photos.js`, `stats.js`: existing readable source assets, retained byte-for-byte to keep this cleanup focused. The build minifies them too.
- Root and route `index.html` files: editable page sources using production-like root asset URLs (`/fx.js`, `/site.js`, `/fx.css`, etc.). The build copies these routes, minifies inline executable fallback scripts, and copies images and hosting metadata.
- `build.cjs`: isolated, unbundled esbuild transforms. Exact dev dependency versions are recorded in `package.json` and `package-lock.json`; Prettier formats sources. There is no global install.
- `dist/`: **generated and gitignored**, including compact JS/CSS, HTML/routes and local assets. This is the preview server root. There is no second minified engine/router source beside the readable sources. `node_modules/` is also ignored.

Runtime HTML no longer has an `fx-boot` class, visibility style, noscript override or 2500ms safety timer. Static page content is visible while initialization is pending and if scripts fail to load. The normal incoming reveal still runs; there is no tube on/off/collapse sequence. The fallback FX stub retains instant navigation when `/fx.js` fails, without a cold-start compatibility method. Dead cold/power JSON keys, defaults and forced-false assignments are removed.

The unused idle-entry settings (`idleOnEnter`, `idleEnterDelay`) and uncalled/unexported `idleGlitchNow` helper are removed too. The normal random idle glitch scheduler remains.

Local project images and page content are retained. The empty data-URL favicon prevents an automatic `/favicon.ico` 404. Routing paths, project links, canonical metadata, photo deep links and stats identifiers are retained.

Only this new directory was changed. Production, the earlier potato mockup, and the frozen design reference were not edited.

## Effect changes

- **No tube turn-on/off, cold-start, collapse or power sequence.** `src/site.js` uses `FX.reveal`, the normal incoming grain/scan reveal, with no outgoing phase. Neither `FX.coldStart` nor `FX.powerOff` exists in the engine or fallback stub.
- The 61,425-byte Kodak PNG is removed from the clone's runtime assets. One deterministic 256×256 luminance tile is generated at initialization using three averaged PRNG samples per pixel and uploaded once. The existing dissolve shader still samples this repeating texture; it is not regenerated per frame. The temporary CPU buffer is 65,536 bytes, and the GPU texture is additional runtime memory, not shipped bytes. This approximates fine grain; it is not Kodak film emulation.
- The effect canvas uses at most one backing pixel per CSS pixel and a **750,000-pixel cap**, rather than production's DPR cap of 2. At 1440×900 / DPR 2: **5,184,000 → 748,980 pixels**, an 85.55% reduction. At 390×844 / DPR 2: **1,316,640 → 329,160**, a 75% reduction. Only the WebGL overlay is downsampled. DOM fonts, photographs and the CSS CRT glass retain native browser rendering.
- Reading-page body paragraphs/list entries/meta values use viewport-visible block groups during transitions. Headings, navigation, ledger pages, home lettering, rule segments and photo effects retain their existing units. The original word spans, resting phosphor fill, glow and wrapping remain. A group updates its root and semantic inline color runs instead of every word each frame. At a frozen 175 ms About outgoing frame, production issued **122 WebGL draws**, the clone **15** (including the global scan pass). This is an 87.7% reduction for that sample, not a universal per-page bound or FPS claim.
- Resting-state and transition preparation batch style resets, geometry reads and style writes into separate passes. Scroll warp updates measure before writing transforms. This reduces read/write interleaving; the existing necessary font, resize and project-image remeasurement remains.
- During an asynchronous page swap, the transition leaves the shared scheduler and resumes after page initialization, eliminating repeated clears/draw setup while waiting for data. One final clear removes the completed overlay. The scheduler still has no continuous resting rAF loop. Original occasional home-name idle glitches are retained, with reduced-motion checks.
- Completed photo reveals request one debounced resting-state refresh. The normal initial reveal can finish before photos do; without a refresh, some late photos would miss production's settled warp.
- Memory/core/network/data-saver hints do **not** select lite transitions. The full existing 350 ms out + 640 ms in effect is retained. Data-saver still affects the original photo-loading queue. Reduced motion produces immediate page swaps and photo display, including when enabled after load; running CSS reveals settle at their next frame.
- With WebGL unavailable, navigation retains a 350/640 ms opacity transition and the CSS CRT glass; rules are explicitly painted and real photographs remain accessible. Reduced motion skips the fade. This fallback does not emulate WebGL grain.
- The site navigation caller serializes swaps and retains the newest pending request, preventing queued requests from retaining removed `<main>` nodes during rapid navigation. Fetch caching, metadata updates, hash handling, prefetch, history, raw-markdown toggles and scroll management otherwise remain the production implementation.

Removed production settings remain removed: power, touch bloom, VCR line, rolling band and CRT flicker are not revived. Existing scan, chroma, tear, phosphor, grain and interlaced-photo vocabulary is used throughout. No shutters were introduced.

## Comparable sizes

Measured with `measure.py`, comparing the preserved **pre-cleanup mockup** to the generated preview. All values are bytes. Gzip is level 9, `mtime=0`, summed across separately compressed files, including binary images for the all-static row. The Python server does not automatically serve gzip.

| Scope | Before raw | Built raw | Before gzip | Built gzip |
|---|---:|---:|---:|---:|
| FX JS + extracted CSS | 85,290 | 37,269 | 26,380 | 13,901 |
| Router JS | 19,160 | 7,626 | 5,923 | 2,845 |
| All runtime JS/CSS (5 → 6 files) | 142,725 | 68,348 | 45,655 | 25,790 |
| All HTML/CSS/JS (14 → 15 files) | 238,920 | 156,465 | 77,805 | 54,950 |
| All generated static files (21 → 22 files) | 2,197,388 | 2,114,933 | 1,926,277 | 1,903,422 |

The runtime comparison includes the additional stylesheet as a separate compressed file. It excludes README, tooling/dependencies, test artifacts, comparison fixtures, generated noise memory, response headers and remote fonts/photos/stats. Those external resources are unchanged. Minification is a transfer-size measure, not evidence of a CPU/FPS/GPU improvement; the existing renderer and scheduler are preserved.

## Verification and visual comparison

Initial checks used Playwright 1.64.1 and cached Chromium revision 1200 on macOS. Playwright, build and formatting dependencies are pinned locally to this mockup. Reports/screenshots go to **gitignored `verification/generated/`**. The entire `verification/` directory, including the regenerated production fixture and earlier reports, is ignored and excluded from the generated runtime.

PR readiness checks also passed from an export containing only tracked/staged files: `npm ci`, `check`, `test:build`, `test:setup`, `measure.py` and `test:browser`, using Playwright's default Chromium revision 1248. No retained fixtures, dependencies or local browser path overrides were needed.

The current settled comparison has 14 pixel-identical pairs out of 16. OurArchive's live stats differ slightly between captures (mean channel delta 0.040/255 desktop, 0.157/255 mobile); text and layout checks still pass. The profile sampler freezes synchronously when `FX.transition` starts, before its first scheduled frame, to avoid accidentally sampling the incoming page. The corrected sample confirms 122 → 15 draws and 5,184,000 → 748,980 effect pixels.

`verification/generated/report.json` records **23 passing check groups, 32 paired settled screenshots, zero console/page errors and zero unexpected failed requests**. The live gallery returned **20 actual photographs**; 20 thumbnails loaded on desktop and 15 in the mobile lookahead region. Failure-mode tests deliberately abort scripts in separate pages.

Coverage:

- Eight routes at **1440×900** and **390×844** CSS viewports, DPR 2, waiting for engine preparation/visible content, then 4.8 seconds before capture.
- Same page content, page bounds, actual font loading, no horizontal overflow and absent power APIs/UI.
- All four project detail pages, live stats, raw/rendered toggle, back/forward.
- Rapid navigation to the latest destination with exactly one remaining main.
- Weak-device hints (1 GB, one core, 2g, save-data) retain full WebGL transitions and the pixel cap.
- Real photo viewer, arrow navigation and Escape on desktop/mobile; reduced motion at load and enabled live.
- WebGL-null fallback with readable content and visible ledger rules.
- JavaScript syntax checks passed.
- All eight routes remain immediately visible when runtime JS requests fail; the missing-FX fallback also supports instant navigation.
- `build-check.cjs` confirms byte-identical repeated builds (22 runtime files), runtime syntax, absent visibility/cold compatibility gates, and—when given the preserved baseline—AST-equivalent engine/router behavior except the explicitly scoped removals and trivial renaming. It also checks exact minified FX stylesheet order/declarations and identical GLSL declarations/math.

Tests map the original directly from local `verification/original/` files, including its runtime assets, without copying fixtures into `dist/`. Network fonts, stats and photographs remain real. Only the text comparison normalizes ordering of equal-count live OurArchive categories; the runtime sorting is untouched.

The historical cleanup baseline was captured before source changes in a local temporary directory. It is not part of this checkout and is not needed for the production comparison or normal build/browser checks.

`verification/generated/readability/report.json` compares 16 new screenshots to that baseline. All page text and bounds match; **10 captures are pixel-identical**. Non-gallery differences stay below an 8/255 channel threshold. Gallery mean channel deltas are **0.060/255 desktop** and **0.027/255 mobile**, with **0.00133%** and **0.000456%** of pixels exceeding 8/255. Photo sources/order and viewer-glass structure/stacking match. Visual inspection of home, About and gallery screenshots confirmed the faithful result.

Across 16 initial reveals, before/after observed ranges were **649.4–674.2 ms / 647.9–675.0 ms** (medians **664.15 / 662.30 ms**). Six About/Home navigation samples were **1010.7–1017.3 ms / 1007.5–1016.3 ms** (medians **1014.40 / 1014.15 ms**). Configured timing remains **640 ms incoming**, **350 ms outgoing**, with no hold. Start time still depends on fonts and live data. These samples check motion continuity, not a performance improvement.

`compare.cjs` additionally compares the built clone to production. Layout/text remains faithful; live equal-count stats ordering and photo compositing can differ between captures. `profile.cjs` waits for the original's initial sequence to finish before sampling the About outgoing frame: **122 → 15 draws**, **5,184,000 → 748,980 canvas pixels**. Those are the existing clone optimizations, not new cleanup changes. Production motion still differs from the clone's grouped body units, procedural grain and lower-resolution overlay.

These are local Chromium layout/functional checks, source sizes, effect-pixel counts and a sampled draw count. They are not measurements on physical low-end hardware, GPU memory totals, CPU/FPS/battery benchmarks, or Safari/Firefox verification. Live network data and font availability can change future comparisons. Viewport screenshots cover the initial portion of long project pages, not every scroll position.

## Run again

From this mockup directory:

```sh
npm ci
npm run build
npm run preview
```

In another terminal:

```sh
npm run check
npm run test:build
npm run test:setup
npx playwright install chromium
npm run test:browser
node profile.cjs
node compare.cjs
python3 measure.py
```

Prerequisites: Node.js 20 or newer, npm, Python 3, and Zola (fixture setup only; checked with Zola 0.23.6). On Linux, `npx playwright install --with-deps chromium` also installs required system libraries. Browser scripts use the local pinned Playwright and its installed Chromium by default. Optional `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM` overrides support an existing installation; `PREVIEW_URL` overrides the preview origin.

Keep the preview server running for browser/profile/comparison checks. Run `test:browser` before `compare.cjs` to create its screenshot pairs; `--refresh-gallery` recaptures only the gallery. Fonts, photos, live stats and tracking require network access and use the existing public production endpoints. Downloaded network responses are not saved as source assets.

`test:setup` is a one-time fixture build per checkout. Zola refuses to overwrite an existing `verification/original/`; reuse that fixture for repeated comparisons. To compare updated production content, preserve the old fixture and run the setup in a fresh checkout.

The historical pre-cleanup AST audit is optional and requires that original local baseline (not the Zola production fixture):

```sh
export BASELINE_DIR=/path/to/preserved-pre-cleanup-baseline
node build-check.cjs
node readability-check.cjs
python3 measure.py
```

For a future cleanup, capture its baseline with `readability-check.cjs --baseline` into a new temporary `BASELINE_DIR` while serving the pre-change mockup. Verification fixtures/artifacts are not required by the preview.

## Follow-ups

- Audit shared WebGL uniform state across scheduler entries, especially explicit mode and warp setup for photo/page/global passes. This cleanup preserves existing setup and shader behavior.
- Audit rejection/exception recovery in asynchronous page swaps, scheduler ticks and photo/viewer promise chains: settlement, visibility restoration, queue recovery and effect removal need a separate focused change.

This is an isolated prototype. Preview/build commands do not publish it or replace the production site.
