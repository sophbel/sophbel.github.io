/**
 * Copy the Sveltia CMS bundle into public/admin.
 *
 * Vendored rather than loaded from a CDN: the site should not depend on a third
 * party being up at page load, and the version editors get is then pinned by
 * package.json rather than by whatever a CDN resolves today.
 *
 * The package only exports ".", so the bundle is located from its resolved
 * entry point rather than by reaching into dist/ directly.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

// Resolves to dist/sveltia-cms.mjs - a self-contained ESM bundle with no
// relative imports, so copying the single file is enough.
const entry = require.resolve('@sveltia/cms');
const target = new URL('../public/admin/sveltia-cms.mjs', import.meta.url);

const { version } = JSON.parse(
  readFileSync(join(dirname(dirname(entry)), 'package.json'), 'utf8'),
) as { version: string };

await mkdir(new URL('.', target), { recursive: true });
await copyFile(entry, target);
console.log(`Vendored @sveltia/cms ${version}`);
