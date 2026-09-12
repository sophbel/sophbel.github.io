/** Routes that come from collections rather than from the Pages collection. */
export interface NavItem {
  label: string;
  href: string;
  order: number;
  /**
   * Off the site for now, and out of `NAV`. The entry stays so bringing the
   * section back is deleting one word rather than reconstructing a menu.
   */
  shelved?: true;
}

/**
 * Sections that are built no longer and linked from nowhere.
 *
 * Everything here is real work with nothing real in it yet - a team of
 * placeholder people, three placeholder projects, fixtures where a calendar
 * and a photo folder will go. A menu item leading to a page of invented
 * content is worse than a menu that is short.
 *
 * Nothing is deleted. Each one's page lives in `src/pages/` under a leading
 * underscore, which is how Astro says "compile this, do not route it", so the
 * code keeps pace with the rest of the site instead of rotting in the history.
 * Bringing a section back is two edits: drop the `_` from its filename, and
 * drop `shelved` from its entry below.
 */
export const COLLECTION_NAV: NavItem[] = [
  { label: 'Publications', href: '/publications', order: 3 },
  // Directly under Publications, and named rather than folded into a GitHub
  // link in a footer. Across the lab sites we looked at, code and data are
  // either absent from the menu or buried inside a project page; putting them
  // at the top level is the fastest thing that separates a research group's
  // site from a departmental template, and it is a claim about how the lab
  // works rather than a decoration.
  { label: 'Software & data', href: '/software', order: 4, shelved: true },
  { label: 'Team', href: '/team', order: 5, shelved: true },
  { label: 'Projects', href: '/projects', order: 6, shelved: true },
  { label: 'News', href: '/news', order: 7, shelved: true },
  { label: 'Events', href: '/events', order: 8, shelved: true },
  { label: 'Gallery', href: '/gallery', order: 9, shelved: true },
];

/**
 * Pages-collection entries that are shelved the same way.
 *
 * Join us describes positions that are not open yet. It cannot be
 * underscore-prefixed like the others, because it is not a route file: it is
 * Markdown rendered by `[slug].astro`, which filters on this list. The file
 * stays in the collection and the CMS keeps offering it, so the text can be
 * written before the page goes back.
 */
export const SHELVED_PAGES = ['join-us'];

/** The menu, with the shelved sections taken out. */
export const NAV = COLLECTION_NAV.filter((item) => !item.shelved);

// /how-this-works is deliberately absent: it is a manual for whoever edits the
// site, not something visitors should find in the menu. The page still builds
// and is reachable by URL.

export { url, isCurrent } from './paths.ts';
