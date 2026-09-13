import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Navigation, the identity block and <main> are emitted exactly once, in
 * BaseLayout, on every page.
 *
 * The tempting shortcut, whenever one page wants a different menu, is to emit
 * a second one and hide whichever is not wanted. That puts two "Primary"
 * landmarks and every link twice into the page. It is invisible on screen —
 * which is why it needs a test rather than a review — and it is loud to anyone
 * using a screen reader, who hears the whole menu, then hears it again.
 *
 * The rule is the same for <main>: two of them is two main landmarks, and
 * "skip to content" can only point at one. A page that needs a different
 * shape gets it from CSS, or by rendering it inside <main> as the pages do.
 *
 * Counted in the source rather than the built HTML so the check needs no build
 * step, matching test/rendered-fields.test.ts and test/astro-whitespace.test.ts.
 * If a page ever does need a genuinely separate layout component, this test
 * will fail — and that is the conversation it exists to force, not a nuisance
 * to silence.
 */
const SRC = new URL('../src/', import.meta.url).pathname;
const LAYOUT = 'layouts/BaseLayout.astro';

/** Each landmark, and the pattern that emits it. */
const LANDMARKS = [
  { what: 'the primary navigation', pattern: /aria-label=["']Primary["']/g },
  { what: 'the identity block', pattern: /<Identity[\s/>]/g },
  { what: 'the main landmark', pattern: /<main[\s/>]/g },
];

/**
 * Strip comments, so that documenting the rule does not break it. This file
 * and BaseLayout both name `<main>` in prose while explaining why there is
 * only one of it, and a naive count reads those as emissions. Line comments
 * are only recognised at the start of a line, so a `https://` inside a string
 * survives.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

function astroFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return astroFiles(path);
    return path.endsWith('.astro') ? [path] : [];
  });
}

const files = astroFiles(SRC).map((path) => ({
  name: relative(SRC, path),
  source: withoutComments(readFileSync(path, 'utf8')),
}));

describe('page landmarks', () => {
  for (const { what, pattern } of LANDMARKS) {
    it(`emits ${what} exactly once, from BaseLayout`, () => {
      const emitters = files.flatMap(({ name, source }) => {
        const count = source.match(pattern)?.length ?? 0;
        return count > 0 ? [`${name} x${count}`] : [];
      });
      expect(emitters).toEqual([`${LAYOUT} x1`]);
    });
  }
});
