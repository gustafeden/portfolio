const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const { base, out, original, settle } = require('./test-support.cjs');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM
  });
  const results = [];
  try {
    for (const version of ['original', 'clone']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2
      });
      await context.addInitScript(() => {
        window.drawCalls = 0;
        const draw = WebGLRenderingContext.prototype.drawArrays;
        WebGLRenderingContext.prototype.drawArrays = function (...args) {
          window.drawCalls++;
          return draw.apply(this, args);
        };
      });
      const page = await context.newPage();
      if (version === 'original') await original(page);
      await page.goto(base + '/about/');
      await settle(page);
      await page.evaluate(() => {
        const transition = FX.transition;
        FX.transition = function (...args) {
          const result = transition.apply(this, args);
          window.drawCalls = 0;
          const frozen = FX._debugFreeze(175);
          const canvas = document.querySelector('#fx-canvas');
          window.profileMetrics = {
            frozen,
            page: args[0].dataset.page,
            drawCalls: window.drawCalls,
            canvasPixels: canvas.width * canvas.height
          };
          return result;
        };
        document.querySelector('a[href="/"]').click();
      });
      await page.waitForFunction(() => window.profileMetrics);
      const metrics = await page.evaluate(() => window.profileMetrics);
      if (!metrics.frozen || metrics.page !== 'about')
        throw new Error('Expected a frozen About outgoing frame');
      await page.screenshot({
        path: path.join(out, `transition-about-${version}.png`)
      });
      results.push({ version, ...metrics });
      await context.close();
    }
    fs.writeFileSync(
      path.join(out, 'effect-profile.json'),
      JSON.stringify(results, null, 2)
    );
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
