/**
 * The design, as tokens.
 *
 * Fonts, colours, a type and space scale, a few shape values. Everything else
 * the design does — its arrangement and its component variants — lives in
 * `styles/design.css`. What stays out of both is content, routes and markup:
 * the design is a layer over the site, not a version of it.
 *
 * Everything here is emitted as custom properties on `:root` by
 * `components/Tokens.astro`. Values belong here rather than in the stylesheet:
 * a weight repeated twenty times in one CSS file is a decision nobody can find
 * to change, which is what happened to the rule weights below before they were
 * named.
 *
 * Design language is our own; the content model and some structural ideas are
 * adapted from MIT-licensed projects listed in CREDITS.md.
 */

export interface DesignSpec {
  /**
   * `mono` is optional: this design gives monospace no job beyond `<code>`, so
   * it says nothing and keeps the system stack.
   */
  fonts: { display: string; body: string; mono?: string };
  /** Utopia type scale, in px at each end of the viewport range. */
  type: { minBase: number; maxBase: number; minRatio: number; maxRatio: number };
  /** Base space step in px at each end. */
  space: { minBase: number; maxBase: number };
  /**
   * Colour tokens. Light only: the site has no dark palette, and a design that
   * only half-exists in the dark is not a design anyone can judge.
   */
  colors: Record<string, string>;
  /**
   * Non-colour, non-type structural choices.
   *
   * Three rule weights, not one: this design draws its structure with rules,
   * so it has to say which rule is which - `rule` divides rows inside a list,
   * `ruleStrong` opens a section, `ruleHeavy` closes a masthead.
   */
  shape: {
    radius: string;
    rule: string;
    ruleStrong: string;
    ruleHeavy: string;
    measure: string;
    measureWide: string;
    pageMax: string;
  };
}

/*
 * Archivo, self-hosted and variable. One family does all the work here, so the
 * fallbacks are grotesques of a similar width and the page does not reflow
 * noticeably while the face loads.
 */
const GROTESQUE = "'Archivo Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

/**
 * "Record": achromatic, gridded, one grotesque. The site is a record of the
 * work rather than an argument for it, so the design stands behind it — see
 * `docs/design.md` for what that buys and what it costs.
 */
export const DESIGN: DesignSpec = {
  fonts: { display: GROTESQUE, body: GROTESQUE },
  /*
   * One family, so the scale has to carry the hierarchy a second family
   * would otherwise carry: a wide ratio at the large end, against a body
   * size that stays put.
   */
  type: { minBase: 17, maxBase: 18, minRatio: 1.2, maxRatio: 1.333 },
  space: { minBase: 16, maxBase: 22 },
  /*
   * Achromatic, plus one hue. Every grey here is neutral - red, green and blue
   * equal - so the accent is the only colour on the page and therefore always
   * means something. `grid` is the gutter rule: quieter than `border`, because
   * it draws the structure rather than separating content.
   *
   * The hue is #7b4b8a, which is the colour of the favicon and of the site she
   * had before this one. It is the one thing about the old site worth keeping:
   * a tab strip and a browser history are where a site is recognised, and a
   * mark in one colour beside a site in another is two labs.
   *
   * It clears 4.5:1 four ways, which the vermilion this replaced did not: as
   * link text on the page (6.26), as link text on a card (5.73), as the ground
   * under white (6.53), and as the placeholder label on a team card - that
   * last one was 4.26 in vermilion, and is the reason to check all four rather
   * than only the two a colour is usually picked against.
   *
   * Those four ratios, and the non-text ones below, are asserted in
   * test/contrast.test.ts. A number quoted in a comment does not fail a build,
   * and this palette has already had to replace an accent once.
   *
   * Three greys draw lines, and they are three because they are answerable to
   * different thresholds. `grid` is the gutter hairline: structure, not
   * information, so it may be as quiet as it likes. `border` divides rows and
   * edges cards: it groups content, and at 1.71:1 it is deliberately almost
   * nothing. `linkRule` is the underline under a title in a list of titles,
   * and that one identifies a control - the title takes the heading colour
   * because colouring every entry of an all-link list says nothing, so the
   * underline is the whole of what says "link", and the hover that promotes it
   * to the accent is the one state a phone never reaches. WCAG 1.4.11 asks 3:1
   * of it; #8a8a8a is the lightest neutral that clears it against the page and
   * against a card both.
   */
  colors: {
    bg: '#fafafa',
    surface: '#f0f0f0',
    text: '#171717',
    muted: '#5a5a5a',
    heading: '#000000',
    accent: '#7b4b8a',
    accentText: '#ffffff',
    border: '#c2c2c2',
    linkRule: '#8a8a8a',
    grid: '#e4e4e4',
  },
  /*
   * Two measures, and one width the page is never wider than.
   *
   * `measure` is the setting for one column of text with nothing beside it,
   * which is every width below the module. `measureWide` is the module's own,
   * and it is wider because there the column has a menu on one side and an
   * index on the other: the eye returns to a left edge that is marked by a
   * drawn gutter rather than by the edge of the screen, and six characters
   * more is a line the column can carry. `design.css` swaps one for the other
   * at 62rem and nothing else knows which is in force.
   *
   * `pageMax` is what the module comes to when the text column is at
   * `measureWide`: 14rem and 13rem of columns, two gutters, and the page's own
   * padding either side. It is one number because the page and the footer
   * under it have to stop at the same place, and they were two copies of it.
   */
  shape: {
    radius: '0',
    rule: '1px',
    ruleStrong: '2px',
    ruleHeavy: '3px',
    measure: '60ch',
    measureWide: '66ch',
    pageMax: '82rem',
  },
};

/** Fallbacks for anything the design does not name a face for. */
export const FONT_STACKS = { mono: MONO };

/** Viewport range every fluid value interpolates across. */
export const VIEWPORT = { minViewport: 320, maxViewport: 1240 };

/**
 * Type scale steps: -1 for fine print up to 5 for a page title.
 *
 * There is deliberately no -2. It resolves to between 10px and 12px, which is
 * too small to read on a phone.
 */
export const TYPE_STEPS = [-1, 0, 1, 2, 3, 4, 5];

/** Named space multipliers of the base step. */
export const SPACE_STEPS: Record<string, number> = {
  '3xs': 0.25,
  '2xs': 0.5,
  xs: 0.75,
  s: 1,
  m: 1.5,
  l: 2,
  xl: 3,
  '2xl': 4,
  '3xl': 6,
};
