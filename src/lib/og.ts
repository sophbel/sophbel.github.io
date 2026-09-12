/**
 * The link-preview card, as a fact both halves of it can read.
 *
 * `scripts/generate-og-card.ts` draws the image; `layouts/BaseLayout.astro`
 * declares it to the platforms that unfurl a URL. Those platforms are told the
 * size in `og:image:width` and `og:image:height` and will lay out a preview
 * from that before the image itself has loaded, so a number here that the
 * drawing does not match is a preview that reflows or crops. One declaration,
 * imported twice, is cheaper than that.
 *
 * 1200x630 is the size the Open Graph consumers converge on, and it is just
 * over 1.91:1, which is what `summary_large_image` asks for.
 */
export const OG_CARD = {
  /** Site-relative; goes through `url()` like any other asset. */
  path: '/og.jpg',
  width: 1200,
  height: 630,
  /**
   * The card is a picture of the site's masthead, so it says what the page
   * beside it already says. Described rather than transcribed: a preview is
   * decoration next to its own title and description, and repeating them into
   * a screen reader is noise.
   */
  alt: 'The masthead of the Belman Lab site: her name, her discipline and her portrait.',
} as const;
