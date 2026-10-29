import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile, cp, readFile } from 'node:fs/promises';
import { loadContent } from './content.mjs';
import { renderPage } from '../src/render.js';
const root = new URL('../', import.meta.url);
const content = await loadContent(root);
const styleVersion = createHash('sha256').update(await readFile(new URL('css/style.css', root))).digest('hex').slice(0, 12);
const html = renderPage(content, { styleVersion }).replace(/[ \t]+$/gm, '');
await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/src/', root), { recursive: true });
// Commit root output to preserve GitHub Pages' existing branch deployment.
await writeFile(new URL('index.html', root), html);
await writeFile(new URL('dist/index.html', root), html);
for (const path of ['css', 'images', 'articles', 'viewer.html', 'src/main.js']) {
  await cp(new URL(path, root), new URL(`dist/${path}`, root), { recursive: true });
}
await writeFile(new URL('dist/.nojekyll', root), '');
console.log(`Built dist/ and index.html: ${content.projects.length} projects, ${content.notes.length} articles. No runtime dependencies.`);
