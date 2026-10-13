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
const PAGES = ['/', '/research/', '/publications/', '/news/', '/join-us/', '/how-this-works/', '/404.html'];

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
/** 42rem: below it the menu is the burger, from it up the menu is in the flow. */
const BURGER_MAX_PX = 42 * 16;
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
        const STANDING = '.site-nav a, .nav__toggle, .social a, .footer a, .skip, .section-index a';
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

  /*
    The menu itself, not just its size.

    Everything above measures a page at rest. The burger is a control with
    states, and a state that cannot be reached is invisible to a measurement:
    a bar that never opens measures perfectly. So below 42rem this opens it,
    reads what opened, and shuts it by each of the three ways a reader will
    try; and above 42rem it checks the button is not there to get in the way.
  */
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const where = `${vp.name}/menu`;
  const state = () =>
    page.evaluate(() => {
      const toggle = document.querySelector('.nav__toggle');
      const links = [...document.querySelectorAll('.site-nav a')];
      const shown = links.filter((a) => a.getBoundingClientRect().height > 0);
      const bar = document.querySelector('.site-nav').getBoundingClientRect();
      return {
        toggleShown: !!toggle && toggle.getBoundingClientRect().height > 0,
        toggleHeight: Math.round(toggle?.getBoundingClientRect().height ?? 0),
        expanded: toggle?.getAttribute('aria-expanded'),
        total: links.length,
        shown: shown.length,
        shortest: Math.round(Math.min(...shown.map((a) => a.getBoundingClientRect().height))),
        barTop: Math.round(bar.top),
        barBottom: Math.round(bar.bottom),
        focusOnToggle: document.activeElement === toggle,
        current: links.filter((a) => a.getAttribute('aria-current') === 'page').length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

  if (vp.width < BURGER_MAX_PX) {
    const closed = await state();
    if (!closed.toggleShown) problems.push(`${where}: no menu button below 42rem`);
    if (closed.toggleHeight < MIN_TOUCH_PX) problems.push(`${where}: menu button is ${closed.toggleHeight}px, under ${MIN_TOUCH_PX}`);
    if (closed.expanded !== 'false') problems.push(`${where}: menu button starts ${closed.expanded}, not closed`);
    if (closed.shown !== 0) problems.push(`${where}: ${closed.shown} menu links showing while the menu is closed`);
    if (Math.abs(closed.barBottom - vp.height) > 1) problems.push(`${where}: the closed bar ends ${closed.barBottom}px, not at the foot (${vp.height}px)`);

    await page.click('.nav__toggle');
    const open = await state();
    if (open.expanded !== 'true') problems.push(`${where}: menu button did not report open`);
    if (open.shown !== open.total) problems.push(`${where}: ${open.shown} of ${open.total} menu links showing when open`);
    if (open.shortest < MIN_TOUCH_PX) problems.push(`${where}: a menu row is ${open.shortest}px, under ${MIN_TOUCH_PX}`);
    if (open.barTop < 0) problems.push(`${where}: the open menu runs off the top of the screen`);
    if (Math.abs(open.barBottom - vp.height) > 1) problems.push(`${where}: the open menu moved off the foot of the screen`);
    if (open.current !== 1) problems.push(`${where}: ${open.current} links marked as the current page`);
    if (open.overflow) problems.push(`${where}: the open menu scrolls the page sideways`);

    await page.keyboard.press('Escape');
    const escaped = await state();
    if (escaped.expanded !== 'false' || escaped.shown !== 0) problems.push(`${where}: Escape did not close the menu`);
    if (!escaped.focusOnToggle) problems.push(`${where}: Escape did not return focus to the menu button`);

    await page.click('.nav__toggle');
    await page.mouse.click(vp.width / 2, 10);
    const outside = await state();
    if (outside.expanded !== 'false' || outside.shown !== 0) problems.push(`${where}: a tap outside did not close the menu`);

    // And the way in for anyone with no script: the five-tab bar, whole.
    const bare = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, javaScriptEnabled: false });
    const barePage = await bare.newPage();
    await barePage.goto(BASE + '/', { waitUntil: 'networkidle' });
    const noScript = await barePage.evaluate(() => ({
      toggle: document.querySelector('.nav__toggle').getBoundingClientRect().height,
      links: [...document.querySelectorAll('.site-nav a')].filter((a) => a.getBoundingClientRect().height > 0).length,
      total: document.querySelectorAll('.site-nav a').length,
    }));
    if (noScript.toggle > 0) problems.push(`${where}: a menu button with no script to open it`);
    if (noScript.links !== noScript.total) problems.push(`${where}: with no script ${noScript.links} of ${noScript.total} menu links are reachable`);
    await bare.close();
  } else {
    const wide = await state();
    if (wide.toggleShown) problems.push(`${where}: a menu button at ${vp.width}px, where the menu is already in the page`);
    if (wide.shown !== wide.total) problems.push(`${where}: ${wide.shown} of ${wide.total} menu links showing`);
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
