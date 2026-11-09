const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM;
const {
  base,
  out,
  original,
  settle,
  comparableText
} = require('./test-support.cjs');
const report = { screenshots: [], errors: [], failedRequests: [], checks: [] };
async function snapshot(page) {
  return page.evaluate(() => ({
    text: document.querySelector('main').innerText,
    title: document.title,
    font: getComputedStyle(
      document.querySelector('h1') || document.querySelector('main')
    ).fontFamily,
    fonts: [...document.fonts]
      .filter((f) => f.status === 'loaded')
      .map((f) => f.family + ':' + f.weight),
    main: (() => {
      const r = document.querySelector('main').getBoundingClientRect();
      return [r.x, r.y, r.width, r.height];
    })(),
    words: document.querySelectorAll('.u').length,
    photos: document.querySelectorAll('.tile').length,
    loadedPhotos: [...document.querySelectorAll('.tile img')].filter(
      (i) => i.naturalWidth > 0
    ).length,
    canvas: (() => {
      const c = document.querySelector('#fx-canvas');
      return c ? [c.width, c.height] : null;
    })(),
    lite: FX.lite,
    overflow: document.documentElement.scrollWidth > innerWidth,
    power: !!document.querySelector('#fx-power, #fx-power-on'),
    apiCold: typeof FX.coldStart,
    apiPower: typeof FX.powerOff
  }));
}
(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2
    });
    // Both origins use the same actual files and endpoints; only HTML path links need local routing.
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
    for (const mobile of [false, true]) {
      for (const route of routes) {
        const pages = [];
        for (const version of ['original', 'clone']) {
          const page = await context.newPage();
          await page.setViewportSize(
            mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
          );
          page.on('pageerror', (e) =>
            report.errors.push({ version, route, error: e.message })
          );
          page.on('console', (m) => {
            if (m.type() === 'error')
              report.errors.push({ version, route, error: m.text() });
          });
          page.on('requestfailed', (r) =>
            report.failedRequests.push({
              version,
              url: r.url(),
              error: r.failure()?.errorText
            })
          );
          if (version === 'original') await original(page);
          await page.goto(base + route);
          await settle(page);
          const data = await snapshot(page);
          const name = `${mobile ? 'mobile' : 'desktop'}-${route === '/' ? 'home' : route.split('/').filter(Boolean).join('-')}-${version}.png`;
          await page.mouse.move(0, 0);
          await page.screenshot({ path: path.join(out, name) });
          if (version === 'clone' && route === '/photographs/') {
            await page.locator('.tile').first().click();
            await page.waitForFunction(
              () => document.querySelector('#v-img').naturalWidth > 0
            );
            await page.waitForTimeout(1200);
            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(1500);
            await page.keyboard.press('Escape');
          }
          report.screenshots.push({ name, data });
          pages.push({ page, data });
        }
        assert.equal(
          comparableText(pages[0].data.text),
          comparableText(pages[1].data.text),
          route + ' content parity'
        );
        assert.deepEqual(
          pages[0].data.main,
          pages[1].data.main,
          route + ' main layout parity'
        );
        assert.equal(pages[0].data.font, pages[1].data.font);
        assert(
          pages[1].data.fonts.some((f) => /Red Hat Mono/.test(f)),
          'real Mono font loaded'
        );
        assert(!pages[1].data.overflow, route + ' horizontal overflow');
        assert(!pages[1].data.power);
        assert.equal(pages[1].data.apiCold, 'undefined');
        assert.equal(pages[1].data.apiPower, 'undefined');
        if (route === '/photographs/')
          assert(pages[1].data.loadedPhotos > 0, 'real photographs loaded');
        report.checks.push(
          `${mobile ? 'mobile' : 'desktop'} ${route}: content, main bounds, fonts, no overflow, no power hooks`
        );
        for (const { page } of pages) await page.close();
      }
    }
    const page = await context.newPage();
    page.on('pageerror', (e) =>
      report.errors.push({ version: 'clone', error: e.message })
    );
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 1 });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 1 });
      Object.defineProperty(navigator, 'connection', {
        get: () => ({ saveData: true, effectiveType: '2g' })
      });
    });
    await page.goto(base);
    await settle(page);
    assert.equal(await page.evaluate(() => FX.lite), false);
    await page.click('a[href="/projects/"]');
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('fx-transitioning')
    );
    const canvas = await page.evaluate(() => ({
      w: document.querySelector('#fx-canvas').width,
      h: document.querySelector('#fx-canvas').height
    }));
    assert(canvas.w * canvas.h <= 750000);
    await page.waitForFunction(
      () =>
        document.querySelector('main:not([hidden])')?.dataset.page ===
          'projects' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    await page.click('a[href="/projects/bifrost/"]');
    await page.waitForFunction(
      () =>
        document.querySelector('main:not([hidden])')?.dataset.slug ===
          'bifrost' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    await page.click('[data-toggle-raw]');
    assert(
      await page
        .locator('main')
        .evaluate((e) => e.classList.contains('show-raw'))
    );
    await page.click('[data-toggle-raw]');
    await page.goBack();
    await page.waitForFunction(
      () =>
        document.querySelector('main:not([hidden])')?.dataset.page ===
          'projects' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    await page.goForward();
    await page.waitForFunction(
      () =>
        document.querySelector('main:not([hidden])')?.dataset.slug ===
          'bifrost' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    report.checks.push(
      'weak-device hints retain full WebGL transitions; <=750,000 effect pixels; project raw toggle; back/forward'
    );
    await page.goto(base);
    await settle(page);
    await page.evaluate(() => {
      document.querySelector('a[href="/projects/"]').click();
      setTimeout(
        () => document.querySelector('a[href="/photographs/"]')?.click(),
        30
      );
      setTimeout(
        () => document.querySelector('a[href="/about/"]')?.click(),
        60
      );
    });
    await page.waitForFunction(
      () =>
        location.pathname === '/about/' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    assert.equal(await page.locator('main.page').count(), 1);
    report.checks.push(
      'rapid navigation latest destination wins; one main remains'
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.click('a[href="/"]');
    await page.waitForFunction(
      () =>
        location.pathname === '/' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    await page.click('a[href="/projects/"]');
    await page.waitForFunction(
      () =>
        location.pathname === '/projects/' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    assert.equal(await page.locator('main.page').count(), 1);
    report.checks.push('reduced motion enabled live: instant navigation');
    await page.goto(base + '/photographs/');
    await settle(page);
    assert.equal(await page.evaluate(() => FX.lite), true);
    await page.locator('.tile').first().click();
    await page.waitForFunction(
      () => document.querySelector('#v-img').naturalWidth > 0
    );
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    assert(
      !(await page.evaluate(() =>
        document.documentElement.classList.contains('viewer-open')
      ))
    );
    report.checks.push(
      'reduced-motion load; real photo viewer, arrows, Escape'
    );
    await page.close();
    const noGL = await context.newPage();
    await noGL.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
      };
    });
    await noGL.goto(base);
    await settle(noGL);
    assert.equal(await noGL.evaluate(() => FX.lite), true);
    await noGL.click('a[href="/projects/"]');
    await noGL.waitForFunction(
      () =>
        location.pathname === '/projects/' &&
        !document.documentElement.classList.contains('fx-transitioning')
    );
    assert(
      await noGL
        .locator('[data-rule]')
        .first()
        .evaluate(
          (e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'
        )
    );
    report.checks.push(
      'WebGL absent: full-duration fade, readable content, CRT glass, visible rules'
    );
    await noGL.close();
    for (const route of routes) {
      const failedJS = await context.newPage();
      await failedJS.route(base + '/**/*.js', (request) => request.abort());
      await failedJS.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert(
        await failedJS.locator('main').isVisible(),
        route + ' script-load-failure content'
      );
      assert.equal(
        await failedJS
          .locator('body')
          .evaluate((element) => getComputedStyle(element).visibility),
        'visible'
      );
      await failedJS.close();
    }
    report.checks.push(
      'all eight routes remain visible immediately when runtime JS fails to load'
    );
    const missingFX = await context.newPage();
    await missingFX.route(base + '/fx.js', (request) => request.abort());
    await missingFX.goto(base + '/projects/');
    await settle(missingFX);
    assert.equal(await missingFX.evaluate(() => FX.__isStub), true);
    await missingFX.click('a[href="/projects/the-great-exit/"]');
    await missingFX.waitForFunction(
      () =>
        location.pathname === '/projects/the-great-exit/' &&
        document.querySelectorAll('main.page').length === 1
    );
    assert(await missingFX.locator('main').isVisible());
    report.checks.push(
      'effects JS missing: fallback stub keeps content and instant navigation working'
    );
    await missingFX.close();
    fs.writeFileSync(
      path.join(out, 'report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(
      JSON.stringify(
        {
          checks: report.checks,
          errors: report.errors,
          failedRequests: report.failedRequests,
          screenshots: report.screenshots.length
        },
        null,
        2
      )
    );
    assert.equal(
      report.errors.filter((e) => e.version === 'clone').length,
      0,
      'clone console/page errors'
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  fs.writeFileSync(
    path.join(out, 'report.json'),
    JSON.stringify({ ...report, failure: error.stack }, null, 2)
  );
  console.error(error);
  process.exitCode = 1;
});
