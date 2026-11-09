const fs = require('node:fs');
const path = require('node:path');

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:18766';
const out = path.join(__dirname, 'verification/generated');
fs.mkdirSync(out, { recursive: true });

async function mapFiles(page, directory, pattern = base + '/**') {
  await page.route(pattern, async (route) => {
    const pathname = decodeURIComponent(
      new URL(route.request().url()).pathname
    );
    const file = path.resolve(
      directory,
      '.' + pathname + (pathname.endsWith('/') ? 'index.html' : '')
    );
    if (!file.startsWith(path.resolve(directory) + path.sep))
      return route.abort();
    await route.fulfill({ path: file });
  });
}

async function original(page) {
  await mapFiles(page, path.join(__dirname, 'verification/original'));
}

async function settle(page) {
  await page.waitForFunction(
    () =>
      window.FX &&
      (FX.lite || document.querySelector('.u')) &&
      getComputedStyle(document.body).visibility === 'visible'
  );
  await page.waitForTimeout(4800);
}

function comparableText(text) {
  return text.replace(
    /top types\n([^\n]+)/g,
    (_, types) => 'top types\n' + types.split(', ').sort().join(', ')
  );
}

module.exports = { base, out, original, settle, mapFiles, comparableText };
