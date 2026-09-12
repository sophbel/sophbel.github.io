/**
 * Build-time switches.
 *
 * Read from `process.env` rather than `import.meta.env` because these are
 * needed in page frontmatter, which runs in Node during the build.
 */

/**
 * Whether search engines may index this build.
 *
 * Indexable by default, and that is a change from the demo, where it was
 * opt-in: the demo carried invented lab members alongside a real academic's
 * name and photograph, and the only safe default for that was "no". This site
 * publishes nothing invented - every section that still holds stand-in
 * content is shelved - so the default that matches what it is has flipped.
 *
 * The switch survives inverted rather than being deleted, because the failure
 * modes are not symmetrical. A site that is quietly not indexed looks exactly
 * like a site that is, and nobody finds out for months. A preview build that
 * is indexable is published nowhere and so indexed by nobody. Given one of
 * those has to be the default, it should be the one that fails loudly.
 *
 * Pages that should never be indexed say so for themselves - `noindex` on
 * `BaseLayout`, which /how-this-works and the 404 page both set - so this is
 * about the build, not about individual pages.
 */
export const isIndexable = process.env.SITE_NOINDEX !== 'true';
