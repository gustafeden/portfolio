const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const { base, out, original, settle } = require('./test-support.cjs');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM
  });
  try {
    const page = await browser.newPage();
    await page.route(base + '/verification/**', async (route) => {
      await route.fulfill({
        path: path.join(
          out,
          path.basename(new URL(route.request().url()).pathname)
        )
      });
    });
    await page.goto(base + '/');
    if (process.argv.includes('--refresh-gallery')) {
      for (const mobile of [false, true]) {
        for (const version of ['original', 'clone']) {
          const context = await browser.newContext({
            viewport: mobile
              ? { width: 390, height: 844 }
              : { width: 1440, height: 900 },
            deviceScaleFactor: 2
          });
          const capture = await context.newPage();
          if (version === 'original') await original(capture);
          await capture.goto(base + '/photographs/');
          await settle(capture);
          await capture.mouse.move(0, 0);
          await capture.screenshot({
            path: path.join(
              out,
              `${mobile ? 'mobile' : 'desktop'}-photographs-${version}.png`
            )
          });
          await context.close();
        }
      }
    }
    const names = fs
      .readdirSync(out)
      .filter((n) => n.endsWith('-original.png'));
    if (!names.length) throw new Error('Run npm run test:browser first');
    const results = [];
    for (const name of names) {
      results.push(
        await page.evaluate(async (name) => {
          async function pixels(file) {
            const img = new Image();
            img.src = '/verification/' + file;
            await img.decode();
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return {
              w: img.width,
              h: img.height,
              data: ctx.getImageData(0, 0, img.width, img.height).data
            };
          }
          const a = await pixels(name),
            b = await pixels(name.replace('-original', '-clone'));
          let different = 0,
            significant = 0,
            delta = 0;
          for (let i = 0; i < a.data.length; i += 4) {
            const d = Math.max(
              ...[0, 1, 2].map((c) => Math.abs(a.data[i + c] - b.data[i + c]))
            );
            if (d) different++;
            if (d > 8) significant++;
            delta += [0, 1, 2].reduce(
              (s, c) => s + Math.abs(a.data[i + c] - b.data[i + c]),
              0
            );
          }
          return {
            pair: name.replace('-original.png', ''),
            width: a.w,
            height: a.h,
            changedPixels: different,
            changedPercent: (different / (a.w * a.h)) * 100,
            significantPercent: (significant / (a.w * a.h)) * 100,
            meanChannelDelta: delta / (a.w * a.h * 3)
          };
        }, name)
      );
    }
    fs.writeFileSync(
      path.join(out, 'pixel-comparison.json'),
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
