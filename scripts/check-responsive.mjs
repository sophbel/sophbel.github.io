/**
 * Drive a real browser over every page and viewport.
 *
 * Written because static review missed three genuine bugs: a media query that
 * lost to a more specific selector, text resolving to under 12px on a phone,
 * and a fixed control covering nearly half a small screen. None of them are
 * visible in the source.
 *
 * The type floors are split: fine print may go to 12px, body text on a phone
 * may not go under 16px, and anything landing between the two is reported as
 * well, because that is where a design shrinks running text by hand.
 *
 * Needs a running preview server and a chromium binary:
 *   pnpm build && pnpm preview &
 *   pnpm check:responsive
 *
 * `nix develop` provides chromium; CHROMIUM overrides the path.
 */
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4321';
const EXEC = process.env.CHROMIUM ?? execSync('command -v chromium || true').toString().trim();
if (!EXEC) {
  console.error('No chromium found. Set CHROMIUM=/path/to/chromium, or run inside `nix develop`.');
  process.exit(1);
}

const VIEWPORTS = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];
// Only what the site publishes. The shelved sections are not built, so there
// is nothing here to drive; see SHELVED_PAGES and `shelved` in src/lib/nav.ts.
const PAGES = ['/', '/research/', '/publications/', '/how-this-works/', '/404.html'];

/*
 * Three floors, not one.
 *
 * 12px is the floor for fine print - captions, credits, publication metadata -
 * and it was never meant as a licence to set body text at 13. On a phone,
 * running text under 16px is text people pinch to read, so body text gets its
 * own floor and anything that lands between the two is flagged as an ad-hoc
 * shrink rather than a deliberate step on the scale.
 *
 * Touch targets go to 44px, which is the size a thumb actually hits; 40 was a
 * guess. Only standing controls are measured - the menu, the social row, the
 * footer links, the skip link. A link inside a sentence is the height of the
 * line it sits in, and there is no version of this site where that is 44px.
 */
const MIN_FINE_PX = 12;
const MIN_BODY_PX = 16;
const MIN_TOUCH_PX = 44;
/** Under this width the visitor is holding the page, and the floors apply. */
const MOBILE_MAX_PX = 700;
/** 62rem: where the three-column module opens and the identity becomes 14rem. */
const MODULE_MIN_PX = 992;

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const problems = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const r = await page.evaluate(
      ({ minFine, minBody }) => {
        const de = document.documentElement;
        /*
          Resolve a type step. The custom
          property computes to an unresolved `clamp()`, so it has to be
          measured on a real element rather than read off :root.
        */
        const stepPx = (token) => {
          const probe = document.createElement('span');
          probe.style.cssText = `position:absolute;visibility:hidden;font-size:var(${token})`;
          document.body.append(probe);
          const px = parseFloat(getComputedStyle(probe).fontSize);
          probe.remove();
          return px;
        };
        const finePx = stepPx('--step--1');
        const bodyPx = stepPx('--step-0');
        const offenders = [...document.querySelectorAll('body *')]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && (b.right > de.clientWidth + 1 || b.left < -1);
          })
          .slice(0, 4)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || '-'}`);
        const sizes = [...document.querySelectorAll('p, li, td, dd, span')]
          .map((el) => parseFloat(getComputedStyle(el).fontSize))
          .filter((size) => size > 0);
        /*
          The first heading on the page is the <h1>.

          Grid placement lets a page be drawn in one order and written in
          another. The in-page index used to be emitted before <main> so that
          the source order was the order a phone met things in, which put the
          index's own <h2> ahead of the page's <h1>: a document that opens one
          level down and then climbs, which is the heading-order failure every
          audit tool names and which nothing else here would see. The index is
          inside <main> under the <h1> now and its label is a <p>, so both ways
          of getting this wrong are closed - and this is what says so.
        */
        const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')];
        return {
          overflow: de.scrollWidth > de.clientWidth + 1,
          offenders,
          h1: document.querySelectorAll('h1').length,
          firstHeading: headings[0]?.tagName ?? null,
          finePx,
          bodyPx,
          tiny: sizes.filter((size) => size < minFine).length,
          // Neither body text nor the fine-print step, but under the body
          // floor: something shrank text by hand rather than by scale.
          shrunk: sizes.filter((size) => size < minBody && size > finePx + 0.5).length,
          /*
            The identity links, and how many rows they take. In the 14rem
            column they come to within about ten pixels of the width, so a
            nudge to the type scale, the space scale or the tracking wraps
            one of the three onto a line of its own - which reads as a link
            having fallen off rather than as a deliberate second row. Half a
            pixel of it is invisible in the source and obvious on the page.

            One row or one row each, never the state in between. Both ends are
            deliberate shapes - a row across the masthead, a column down the
            14rem sidebar - and what the check is for is the ragged middle,
            where nothing on the page says whether the break was meant.
          */
          socialRows: new Set(
            [...document.querySelectorAll('.identity .social a')]
              .map((el) => Math.round(el.getBoundingClientRect().top)),
          ).size,
          socialLinks: document.querySelectorAll('.identity .social a').length,
        };
      },
      { minFine: MIN_FINE_PX, minBody: MIN_BODY_PX },
    );

    /*
      The grid's areas and its tracks have to agree.

      `.page` names its areas in one rule and its columns in another, and the
      two are set at four widths by selectors of different specificity. Get one
      of them wrong and `grid-template-areas` still names three columns while
      `grid-template-columns` lists one: the browser invents the missing tracks
      at 0px, every area in them collapses, and the page is still a page - no
      overflow, no error, nothing under any floor. That is how the home page
      shipped a 99px-wide `<main>` eight thousand pixels tall while the checker
      and every test stayed green, and it is only obvious if you happen to open
      the one page at the one width.
    */
    const grid = await page.evaluate(() => {
      const el = document.querySelector('.page');
      const style = getComputedStyle(el);
      if (style.display !== 'grid' || style.gridTemplateAreas === 'none') return null;
      const tracks = style.gridTemplateColumns.split(/\s+/).filter(Boolean);
      const named = (style.gridTemplateAreas.match(/"[^"]*"/g) ?? []).map(
        (row) => row.slice(1, -1).trim().split(/\s+/).length,
      );
      return {
        tracks: tracks.length,
        collapsed: tracks.filter((track) => parseFloat(track) === 0).length,
        named: Math.max(...named),
        columns: style.gridTemplateColumns,
        areas: style.gridTemplateAreas,
      };
    });

    const smallTargets = await page.evaluate(
      ({ minTouch }) => {
        const STANDING = '.site-nav a, .social a, .footer a, .skip, .section-index a';
        return [...document.querySelectorAll(STANDING)]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && b.height < minTouch;
          })
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || '-'} ${Math.round(el.getBoundingClientRect().height)}px`);
      },
      { minTouch: MIN_TOUCH_PX },
    );

    const where = `${vp.name}${path}`;
    const mobile = vp.width < MOBILE_MAX_PX;
    if (r.overflow) problems.push(`${where}: scrolls sideways (${r.offenders.join(', ')})`);
    if (r.h1 !== 1) problems.push(`${where}: ${r.h1} h1 elements`);
    if (r.firstHeading && r.firstHeading !== 'H1') {
      problems.push(`${where}: first heading is ${r.firstHeading}, not the h1`);
    }
    if (grid && grid.named > grid.tracks) {
      problems.push(
        `${where}: .page names ${grid.named} columns in grid-template-areas but sizes ${grid.tracks} (${grid.columns})`,
      );
    }
    if (grid && grid.collapsed > 0) {
      problems.push(`${where}: .page has ${grid.collapsed} column track(s) at 0px (${grid.columns})`);
    }
    if (r.tiny > 0) problems.push(`${where}: ${r.tiny} elements under ${MIN_FINE_PX}px`);
    if (mobile && r.bodyPx < MIN_BODY_PX) {
      problems.push(`${where}: body text resolves to ${r.bodyPx.toFixed(1)}px, under the ${MIN_BODY_PX}px floor`);
    }
    if (mobile && r.shrunk > 0) {
      problems.push(`${where}: ${r.shrunk} elements between the fine-print step (${r.finePx.toFixed(1)}px) and the ${MIN_BODY_PX}px body floor`);
    }
    if (mobile && smallTargets.length > 0) problems.push(`${where}: small touch targets (${smallTargets.join(', ')})`);
    // Only where the identity is a column. Below that it is a full-width
    // block with room to wrap into, and wrapping there is correct.
    if (vp.width >= MODULE_MIN_PX && r.socialRows > 1 && r.socialRows !== r.socialLinks) {
      problems.push(
        `${where}: ${r.socialLinks} identity links wrap raggedly onto ${r.socialRows} rows`,
      );
    }
  }
  await ctx.close();
}

await browser.close();

if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`No problems across ${VIEWPORTS.length} viewports x ${PAGES.length} pages.`);
