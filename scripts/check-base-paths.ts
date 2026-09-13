/**
 * Fail the build if any emitted URL ignores the configured base path.
 *
 * This exists because it already happened: links went through the base-path
 * helper and media did not, so every image 404'd on the deployed project path
 * while working perfectly at the site root locally. A broken link is obvious;
 * a broken <img> just quietly shows nothing.
 *
 * Usage: node scripts/check-base-paths.ts (after `astro build`)
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const base = (process.env.SITE_BASE ?? '/').replace(/\/+$/, '');

if (base === '') {
  console.log('check-base-paths: base is the site root, nothing to check');
  process.exit(0);
}

async function* htmlFiles(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

// Root-relative href/src values only: absolute URLs and relative paths resolve
// themselves and are none of this check's business.
const ROOT_RELATIVE = /(?:href|src)="(\/[^"]*)"/g;

const offences: string[] = [];

for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  for (const [, path] of html.matchAll(ROOT_RELATIVE)) {
    if (path!.startsWith(`${base}/`) || path === base) continue;
    offences.push(`${relative(DIST, file)}: ${path}`);
  }
}

if (offences.length > 0) {
  console.error(`check-base-paths: ${offences.length} URL(s) ignore the base path "${base}":`);
  for (const offence of offences.slice(0, 20)) console.error(`  ${offence}`);
  if (offences.length > 20) console.error(`  ...and ${offences.length - 20} more`);
  console.error('\nEvery root-relative href and src must go through url() from src/lib/paths.ts.');
  process.exit(1);
}

console.log(`check-base-paths: every root-relative URL respects "${base}"`);
