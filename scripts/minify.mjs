import { transform } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

for (const file of [
  'fx.js',
  'site.js',
  'photos.js',
  'stats.js',
  'site.css',
  'fx.css'
]) {
  const path = new URL(`../public/${file}`, import.meta.url);
  const source = await readFile(path, 'utf8');
  const { code } = await transform(source, {
    loader: file.endsWith('.css') ? 'css' : 'js',
    minify: true,
    target: 'es2020',
    legalComments: 'none'
  });
  await writeFile(path, code);
}
