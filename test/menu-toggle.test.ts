import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The burger menu has two failure modes that no render shows.
 *
 * It is script-enhanced, so the page must still work with none: a phone with
 * no script has to get the five-tab bar and every page reachable. And it must
 * not leak upward: above 42rem the menu is in the page and the button is not
 * drawn. `pnpm check:responsive` opens and closes it in a real browser; these
 * pin the two rules that are plain to read in the source, so a change that
 * breaks one fails here first and without a browser.
 */
const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/design.css', import.meta.url), 'utf8');

/** The CSS of the burger block only, comments stripped. */
const burger = (() => {
  const start = css.indexOf('.nav__toggle { display: none; }');
  const end = css.indexOf('@media (min-width: 62rem)', start);
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
})();

describe('the burger menu markup', () => {
  it('is a real button, inside the primary nav and before its links', () => {
    const nav = layout.slice(layout.indexOf('<nav class="site-nav nav"'));
    expect(nav.indexOf('<button class="nav__toggle"')).toBeGreaterThan(-1);
    expect(nav.indexOf('<button class="nav__toggle"')).toBeLessThan(nav.indexOf('nav.map('));
    expect(nav).toMatch(/<button class="nav__toggle" type="button" aria-expanded="false">/);
  });

  it('hides its icon from assistive technology, since the word "Menu" names it', () => {
    expect(layout).toMatch(/<svg class="nav__icon"[^>]*aria-hidden="true"/);
  });

  it('marks the page as scripted before it paints, so the bar never flashes as tabs', () => {
    const head = layout.slice(layout.indexOf('<head>'), layout.indexOf('</head>'));
    expect(head).toContain("classList.add('js')");
  });

  it('closes on Escape, on a tap outside and on returning from the cache, and returns focus', () => {
    expect(layout).toContain("event.key === 'Escape'");
    expect(layout).toContain('nav.contains(event.target)');
    expect(layout).toContain('event.persisted');
    expect(layout).toContain('button.focus()');
  });
});

describe('the burger menu styles', () => {
  it('draws no button by default, and one only where there is script', () => {
    expect(css).toContain('.nav__toggle { display: none; }');
    expect(burger).toMatch(/\.js \.nav__toggle \{[^}]*display:\s*flex/);
  });

  it('hides the links only where there is script to show them again', () => {
    const hiders = burger.match(/[^{}]*\.site-nav:not\(\.is-open\)[^{}]*\{[^}]*display:\s*none/g) ?? [];
    expect(hiders.length).toBeGreaterThan(0);
    for (const rule of hiders) expect(rule).toContain('.js ');
  });

  it('switches the button off and puts the links back from 42rem, where the menu is in the page', () => {
    const wide = burger.slice(burger.indexOf('@media (min-width: 42rem)'));
    expect(wide).toMatch(/\.js \.nav__toggle \{\s*display:\s*none/);
    expect(wide).toMatch(/\.js \.site-nav:not\(\.is-open\) a \{\s*display:\s*inline-flex/);
  });

  it('keeps the closed bar the height the page pads for', () => {
    // `--menu-bar` is 2.75rem of control plus the bar's padding and rule; the
    // button must be that control, or the page's foot hides behind the bar.
    expect(css).toContain('--menu-bar: calc(2.75rem');
    expect(burger).toMatch(/\.js \.nav__toggle \{[^}]*min-block-size:\s*2\.75rem/);
  });
});
