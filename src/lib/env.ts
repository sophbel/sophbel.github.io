/**
 * Build-time switches.
 *
 * Read from `process.env` rather than `import.meta.env` because these are
 * needed in page frontmatter, which runs in Node during the build.
 */

/**
 * Whether search engines may index this build. Defaults to false: the demo
 * publishes placeholder people under a real person's name, and the safe
 * default for that is "not indexed". The real site sets SITE_INDEXABLE=true.
 */
export const isIndexable = process.env.SITE_INDEXABLE === 'true';
