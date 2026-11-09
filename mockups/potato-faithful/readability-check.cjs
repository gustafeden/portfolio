const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { comparableText } = require('./test-support.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:18766';
const baseline = process.env.BASELINE_DIR;
assert(
  baseline,
  'Set BASELINE_DIR to a temporary directory for the preserved baseline'
);
const captureBaseline = process.argv.includes('--baseline');
const output = captureBaseline
  ? baseline
  : path.join(__dirname, 'verification/generated/readability');
const routes = [
  '/',
  '/about/',
  '/projects/',
  '/projects/atelier/',
  '/projects/bifrost/',
  '/projects/ourarchive/',
  '/projects/the-great-exit/',
  '/photographs/'
];
const runtimeEntries = [
  'index.html',
  '404.html',
  'about',
  'projects',
  'photographs',
  'img',
  'fx.js',
  'site.js',
  'site.css',
  'photos.js',
  'stats.js',
  'CNAME',
  'robots.txt',
  'sitemap.xml'
];
fs.mkdirSync(output, { recursive: true });
if (captureBaseline) {
  const runtimeRoot = fs.existsSync(path.join(__dirname, 'fx.js'))
    ? __dirname
    : path.join(__dirname, 'dist');
  const entries = [
    ...runtimeEntries,
    ...(fs.existsSync(path.join(runtimeRoot, 'fx.css')) ? ['fx.css'] : [])
  ];
  for (const entry of entries)
    fs.cpSync(
      path.join(runtimeRoot, entry),
      path.join(baseline, 'runtime', entry),
      { recursive: true }
    );
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM
  });
  const report = {
    snapshots: [],
    timing: [],
    pixels: [],
    errors: [],
    liveTextDifferences: []
  };
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
        deviceScaleFactor: 2
      });
      for (const route of routes) {
        const page = await context.newPage();
        page.on('pageerror', (error) => report.errors.push(error.message));
        await page.addInitScript(() => {
          let engine;
          window.fxTiming = [];
          Object.defineProperty(window, 'FX', {
            configurable: true,
            get: () => engine,
            set(value) {
              engine = value;
              for (const name of ['reveal', 'transition']) {
                if (!value[name]) continue;
                const original = value[name];
                value[name] = function (...args) {
                  const started = performance.now();
                  const result = original.apply(this, args);
                  Promise.resolve(result).then(() =>
                    window.fxTiming.push({
                      name,
                      started,
                      duration: performance.now() - started
                    })
                  );
                  return result;
                };
              }
            }
          });
        });
        await page.goto(base + route);
        await page.waitForFunction(() =>
          window.fxTiming?.some((sample) => sample.name === 'reveal')
        );
        await page.waitForTimeout(4800);
        await page.mouse.move(0, 0);
        const name = `${mobile ? 'mobile' : 'desktop'}-${route === '/' ? 'home' : route.split('/').filter(Boolean).join('-')}`;
        const snapshot = await page.evaluate(() => ({
          text: document.querySelector('main').innerText,
          bounds: (() => {
            const rect = document.querySelector('main').getBoundingClientRect();
            return [rect.x, rect.y, rect.width, rect.height];
          })(),
          photoSources: [...document.querySelectorAll('.tile img')].map(
            (image) => image.dataset.src || image.src
          ),
          loadedPhotos: [...document.querySelectorAll('.tile img')].filter(
            (image) => image.naturalWidth > 0
          ).length,
          glass: [...document.querySelectorAll('.fx-glass')].map((glass) => ({
            children: glass.innerHTML,
            z: getComputedStyle(glass).zIndex
          }))
        }));
        const screenshot = await page.screenshot({
          path: path.join(output, name + '.png')
        });
        report.snapshots.push({ name, ...snapshot });
        report.timing.push({
          name,
          samples: await page.evaluate(() => window.fxTiming)
        });
        if (!captureBaseline) {
          const before = JSON.parse(
            fs.readFileSync(path.join(baseline, 'report.json'))
          ).snapshots.find((item) => item.name === name);
          assert.equal(
            comparableText(snapshot.text),
            comparableText(before.text),
            name + ': content'
          );
          if (snapshot.text !== before.text)
            report.liveTextDifferences.push(
              name + ': tied live top-type ordering'
            );
          assert.deepEqual(snapshot.bounds, before.bounds, name + ': bounds');
          assert.deepEqual(
            snapshot.glass,
            before.glass,
            name + ': viewer glass'
          );
          assert.deepEqual(
            snapshot.photoSources,
            before.photoSources,
            name + ': real photo sources and order'
          );
          if (route === '/photographs/')
            assert(snapshot.loadedPhotos > 0, 'Actual photos loaded');
          const pixels = await page.evaluate(
            async ({ before, after }) => {
              async function decode(bytes) {
                const image = new Image();
                image.src = 'data:image/png;base64,' + bytes;
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                return context.getImageData(0, 0, canvas.width, canvas.height)
                  .data;
              }
              const a = await decode(before),
                b = await decode(after);
              let delta = 0,
                significant = 0;
              for (let i = 0; i < a.length; i += 4) {
                let max = 0;
                for (let c = 0; c < 3; c++) {
                  const d = Math.abs(a[i + c] - b[i + c]);
                  delta += d;
                  max = Math.max(max, d);
                }
                if (max > 8) significant++;
              }
              return {
                meanChannelDelta: delta / ((a.length / 4) * 3),
                significantPercent: (significant / (a.length / 4)) * 100
              };
            },
            {
              before: fs
                .readFileSync(path.join(baseline, name + '.png'))
                .toString('base64'),
              after: screenshot.toString('base64')
            }
          );
          report.pixels.push({ name, ...pixels });
        }
        if (route === '/about/') {
          for (let i = 0; i < 3; i++) {
            await page.click(`a[href="${i % 2 ? '/about/' : '/'}"]`);
            await page.waitForFunction(
              (count) =>
                window.fxTiming.filter((sample) => sample.name === 'transition')
                  .length >= count,
              i + 1
            );
          }
          report.timing.push({
            name: name + '-navigation',
            samples: await page.evaluate(() =>
              window.fxTiming.filter((sample) => sample.name === 'transition')
            )
          });
        }
        await page.close();
      }
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(
      path.join(output, 'report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(
      JSON.stringify(
        {
          screenshots: report.snapshots.length,
          errors: report.errors,
          timing: report.timing,
          pixels: report.pixels
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
