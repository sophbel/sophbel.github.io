/**
 * Draw the link-preview card, and write it to public/og.jpg.
 *
 * The card is what a person sees before they see the site: pasted into an
 * email, a Slack channel, a Bluesky post or a message to a collaborator, the
 * URL unfurls into a picture, a title and a line of description. The picture
 * was her portrait - a 480x474 photograph under `summary_large_image`, which
 * asks for something close to 1.91:1 and crops whatever it is given to fit.
 * A square photograph under that card type loses the top and bottom of the
 * head. The one image that stands in for the site was a band across her eyes.
 *
 * So the card is drawn rather than borrowed, and what it draws is the site's
 * own masthead: the lab in the accent, her name, the discipline, the heavy
 * rule that closes a masthead in this design, where she works, and the
 * portrait as the plate hung off the right of it. Somebody who has seen the
 * site recognises the preview, and somebody who has not has already seen the
 * site by the time they arrive.
 *
 * ## Why a browser
 *
 * Because the alternative is a second implementation of the design. Composing
 * this in an image library means restating the type scale, the letter-spacing,
 * the rule weights and the colours somewhere they can drift from
 * `src/lib/design.ts` without anything failing. Here the card is HTML, the
 * tokens are the site's tokens emitted by the same code `Tokens.astro` uses,
 * and every value below is a `var(--...)`. There are no numbers in this file
 * that describe the design.
 *
 * The chromium that renders it is the one `nix develop` pins and
 * `check-responsive` already drives, so this adds a script rather than a
 * dependency.
 *
 * ## Why committed
 *
 * Same reason as the ORCID snapshot: `public/og.jpg` is checked in, and the
 * build only copies it. A deploy does not need a browser, and a card cannot
 * change because a font rendered differently on a runner one Tuesday.
 * Regenerate it - `pnpm gen:og` - when `src/data/site.json`, the portrait or
 * the identity design changes, and commit the result.
 *
 * ## The one number
 *
 * The card is rendered at half size and screenshot at 2x, which is how it
 * comes out at exactly the 1200x630 the platforms want. Rendering at 600 CSS
 * pixels wide rather than 1200 is not a trick to get a sharper image: it is
 * what sets the type. Every size here is fluid across the viewport range, so
 * the width the card is laid out at chooses its own type scale, and 600 is
 * the width whose scale suits a picture people see two inches wide in a feed.
 * At 1200 the design correctly sets a page for reading at arm's length, which
 * is the wrong thing to photograph.
 *
 * Usage: pnpm gen:og  (needs chromium; `nix develop` provides it)
 */
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { typeScale, spaceScale, tokensToCss } from '../src/lib/utopia.ts';
import { DESIGN, VIEWPORT, TYPE_STEPS, SPACE_STEPS, FONT_STACKS } from '../src/lib/design.ts';
import { site } from '../src/lib/site.ts';
import { OG_CARD } from '../src/lib/og.ts';

/** See the note above on why the layout width is half the output width. */
const SCALE = 2;
const CARD = { width: OG_CARD.width / SCALE, height: OG_CARD.height / SCALE };

const EXEC = process.env.CHROMIUM ?? execSync('command -v chromium || true').toString().trim();
if (!EXEC) {
  console.error('No chromium found. Set CHROMIUM=/path/to/chromium, or run inside `nix develop`.');
  process.exit(1);
}

const root = new URL('../', import.meta.url);
const out = new URL(`public${OG_CARD.path}`, root);

/*
 * The portrait and the face both go in as data URIs. A file:// page can load
 * neither reliably across chromium's sandboxing, and inlining them means the
 * render touches no network and no path, so it produces the same bytes on any
 * machine that has the same two files.
 */
const dataUri = async (path: string, mime: string): Promise<string> =>
  `data:${mime};base64,${(await readFile(new URL(path, root))).toString('base64')}`;

const portrait = await dataUri(`public${site.photo}`, 'image/jpeg');
const archivo = await dataUri(
  'node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2',
  'font/woff2',
);

/*
 * The same token block `components/Tokens.astro` emits, from the same two
 * functions. Not a copy of its values - a second call to the code that makes
 * them, so a change to the scale reaches the card without anyone remembering
 * that the card exists.
 */
const tokens = tokensToCss({
  ...typeScale({ ...VIEWPORT, ...DESIGN.type, steps: TYPE_STEPS }),
  ...spaceScale({ ...VIEWPORT, ...DESIGN.space, steps: SPACE_STEPS }),
  'font-display': DESIGN.fonts.display,
  'font-body': DESIGN.fonts.body,
  'font-mono': DESIGN.fonts.mono ?? FONT_STACKS.mono,
  rule: DESIGN.shape.rule,
  'rule-heavy': DESIGN.shape.ruleHeavy,
  ...Object.fromEntries(
    Object.entries(DESIGN.colors).map(([name, value]) => [`color-${name}`, value]),
  ),
});

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Archivo Variable';
    font-style: normal;
    font-weight: 100 900;
    src: url(${archivo}) format('woff2-variations');
  }

  :root {
${tokens}
  }

  * { box-sizing: border-box; margin: 0; }

  body {
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-body);
    font-synthesis: none;
  }

  /*
    The masthead's arrangement: type takes the row, the portrait is a plate
    hung off the right of it and bottom-aligned, so the first thing read is
    the name rather than a face. The site does this from 42rem up; see
    \`.page:has(h1.identity__name)\` in styles/design.css.
  */
  .card {
    align-items: end;
    block-size: ${CARD.height}px;
    display: grid;
    gap: var(--space-l);
    grid-template-columns: 1fr auto;
    inline-size: ${CARD.width}px;
    padding: var(--space-l);
  }

  .card__lab {
    color: var(--color-accent);
    font-size: var(--step--1);
    font-weight: 700;
    letter-spacing: 0.14em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .card__name {
    color: var(--color-heading);
    font-family: var(--font-display);
    font-size: var(--step-5);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin-block-start: var(--space-3xs);
    text-wrap: balance;
  }

  /* The strapline, and the rule this design closes a masthead with. */
  .card__discipline {
    border-block-end: var(--rule-heavy) solid var(--color-heading);
    font-size: var(--step-0);
    font-weight: 500;
    line-height: 1.2;
    padding-block: var(--space-3xs) var(--space-2xs);
  }

  .card__address {
    color: var(--color-muted);
    font-size: var(--step--1);
    line-height: 1.35;
    padding-block-start: var(--space-2xs);
  }

  .card__photo {
    border: var(--rule) solid var(--color-border);
    display: block;
    inline-size: 11rem;
  }
</style>
</head>
<body>
  <div class="card">
    <div>
      <p class="card__lab">${site.labName}</p>
      <p class="card__name">${site.name}</p>
      <p class="card__discipline">${site.discipline}</p>
      <p class="card__address">${site.jobTitle}<br>${site.department}<br>${site.institution}</p>
    </div>
    <img class="card__photo" src="${portrait}" alt="">
  </div>
</body>
</html>`;

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: CARD.width, height: CARD.height },
  deviceScaleFactor: SCALE,
});
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const image = await page.screenshot({ type: 'jpeg', quality: 92 });
await browser.close();
await writeFile(out, image);

const kb = Math.round(image.byteLength / 1024);
console.log(
  `Wrote public${OG_CARD.path} - ${OG_CARD.width}x${OG_CARD.height}, ${kb}KB`,
);
