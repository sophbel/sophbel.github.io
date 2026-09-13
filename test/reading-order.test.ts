import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The source order of the grid areas is the order a reader meets them.
 *
 * `.page` places navigation, the identity block and `<main>` by grid-area,
 * which is what lets the layout rearrange without changing the markup. The
 * cost is that grid placement moves the picture and not the document: anyone
 * following the page by keyboard, by screen reader or by switch gets the
 * source order regardless of where the boxes landed.
 *
 * Below 42rem the menu is a bar fixed to the foot of the screen, and it is
 * still the first thing in the document. That is the right way round: it is
 * the one part of the chrome a reader came to use, and a reader who cannot
 * see where it is drawn should meet it before the page rather than after it.
 *
 * Above 62rem the menu sits under the identity inside the left column, so
 * those two swap on screen. That is the one place the order is not literal,
 * and it is the right way round for the same reason.
 *
 * The in-page index is not one of these areas any more. It belongs between a
 * page's title and the page, both of which are inside <main>, so no
 * arrangement of this grid can put it there; the pages render it themselves.
 * `renders the index under the heading it indexes` below is what holds that.
 *
 * Matched on the source rather than on built HTML for the same reason as
 * test/single-emission.test.ts: no build step, and the failure is a line in
 * the file someone moved.
 */
const LAYOUT = new URL('../src/layouts/BaseLayout.astro', import.meta.url).pathname;
const source = readFileSync(LAYOUT, 'utf8');

/** The template only. Frontmatter mentions these names for other reasons. */
const template = source.slice(source.indexOf('---', 3) + 3);

/*
  And the markup only. The comments in that template explain where each area
  goes and quote the element names to do it, so a paragraph about why the index
  cannot be a sibling of <main> counted as the emission of <main> - and put it
  first, ahead of the nav that is genuinely above it. The file was right and the
  test was reading its prose. `design.css`'s own token test strips comments for
  the same reason.
*/
const markup = template.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Each grid area, and the first thing in the template that emits it. */
const AREAS = [
  { area: 'nav', pattern: /aria-label=["']Primary["']/ },
  { area: 'identity', pattern: /<Identity[\s/>]/ },
  { area: 'main', pattern: /<main[\s/>]/ },
];

describe('BaseLayout emits the grid areas in reading order', () => {
  const found = AREAS.map(({ area, pattern }) => {
    const match = markup.match(pattern);
    return { area, at: match?.index ?? -1 };
  });

  it.each(found)('emits $area', ({ area, at }) => {
    expect(at, `${area} is not emitted in the template`).toBeGreaterThanOrEqual(0);
  });

  it('orders them nav, identity, main', () => {
    expect(found.map((entry) => entry.area)).toEqual(
      [...found].sort((a, b) => a.at - b.at).map((entry) => entry.area),
    );
  });
});

describe('BaseLayout names the identity block for what it is', () => {
  /*
    It was an <aside>, which is the complementary landmark - "tangentially
    related to the main content". This block is the site's identity on every
    page and on the home page it contains the <h1>, so a screen reader
    announced the page's only heading from inside a landmark that says to skip
    it.
  */
  it('does not wrap the identity in a complementary landmark', () => {
    const identity = markup.slice(markup.indexOf('<Identity') - 200, markup.indexOf('<Identity'));
    expect(identity).not.toMatch(/<aside[^>]*$/);
  });

  it('wraps it in the banner landmark instead', () => {
    expect(markup).toMatch(/<header[^>]*class=["']identity-column["']/);
  });
});

describe('every page renders the index under the heading it indexes', () => {
  /*
    The index used to come from a `rail` slot in BaseLayout, emitted before
    <main> so that the source order matched a phone's reading order - which put
    a page's contents ahead of the page's title. A reader met "01 Core research
    themes" before they met "Research".

    It is rendered by the page now, inside <main> and directly after its <h1>,
    because that is the one position in the document a sibling of <main> cannot
    reach and the only one where an index reads as belonging to the title above
    it. Nothing in the stylesheet can put it back if a page emits it somewhere
    else, and at 62rem it is positioned into a column of its own on the
    assumption that it is there, so this is a markup invariant rather than a
    preference.
  */
  const PAGES = [
    '../src/pages/[slug].astro',
    '../src/pages/publications.astro',
    // Shelved, and still compiled: see SHELVED_PAGES in src/lib/nav.ts.
    '../src/pages/_events.astro',
    '../src/pages/_team/index.astro',
  ];

  it.each(PAGES)('%s puts <SectionIndex> straight after its <h1>', (file) => {
    const text = readFileSync(new URL(file, import.meta.url).pathname, 'utf8');
    const body = text.slice(text.indexOf('<BaseLayout'));
    expect(body, 'page renders no index').toMatch(/<SectionIndex\b/);
    expect(body, 'index is not immediately after the <h1>').toMatch(
      /<h1>[\s\S]*?<\/h1>\s*<SectionIndex\b/,
    );
  });

  it('BaseLayout offers no rail slot for one to be passed to instead', () => {
    expect(markup).not.toMatch(/<slot name=["']rail["']/);
  });
});

describe('the footer', () => {
  /*
    The address block is the only place the email appears, and it was plain
    text: on a phone the one action an academic site exists to support could
    not be tapped, only selected and copied out of fourteen-pixel grey type.
  */
  it('offers the email as a link rather than as characters to copy', () => {
    const footer = markup.slice(markup.indexOf('<footer'));
    expect(footer).toMatch(/href=\{`mailto:\$\{site\.email\}`\}/);
  });
});
