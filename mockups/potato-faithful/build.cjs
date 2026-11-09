const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');

const root = __dirname;
const output = path.join(root, 'dist');
const staticEntries = [
  'index.html',
  '404.html',
  'about',
  'projects',
  'photographs',
  'img',
  'CNAME',
  'robots.txt',
  'sitemap.xml'
];
const assets = {
  'fx.js': 'src/fx.js',
  'site.js': 'src/site.js',
  'fx.css': 'src/fx.css',
  'site.css': 'site.css',
  'photos.js': 'photos.js',
  'stats.js': 'stats.js'
};

async function copyEntry(relative) {
  const source = path.join(root, relative);
  const destination = path.join(output, relative);
  if ((await fs.stat(source)).isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    for (const entry of (await fs.readdir(source)).sort()) {
      await copyEntry(path.join(relative, entry));
    }
    return;
  }
  if (relative.endsWith('.html')) {
    const html = await fs.readFile(source, 'utf8');
    const scripts = /(<script\s*>)([\s\S]*?)(<\/script>)/g;
    let rendered = '';
    let offset = 0;
    for (const match of html.matchAll(scripts)) {
      const { code } = await esbuild.transform(match[2], {
        loader: 'js',
        minify: true,
        target: 'es2017',
        legalComments: 'none'
      });
      rendered +=
        html.slice(offset, match.index) + match[1] + code.trim() + match[3];
      offset = match.index + match[0].length;
    }
    await fs.writeFile(destination, rendered + html.slice(offset));
  } else {
    await fs.copyFile(source, destination);
  }
}

async function build() {
  await fs.mkdir(output, { recursive: true });
  for (const entry of staticEntries) await copyEntry(entry);
  for (const [name, source] of Object.entries(assets)) {
    const { code } = await esbuild.transform(
      await fs.readFile(path.join(root, source), 'utf8'),
      {
        loader: name.endsWith('.css') ? 'css' : 'js',
        minify: true,
        target: 'es2017',
        legalComments: 'none'
      }
    );
    await fs.writeFile(path.join(output, name), code);
  }
  console.log('Built compact runtime assets and static routes in dist/');
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
