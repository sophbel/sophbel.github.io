/**
 * Resolving site paths against the configured base.
 *
 * The same build serves from a domain root and from a GitHub Pages project
 * path, so every root-relative URL the site emits - links AND media - has to
 * be joined onto the base. Media is the easy half to forget: links are visibly
 * broken when you click them, whereas an image just silently fails to appear.
 */

/** Drop trailing slashes, but never reduce the root path to an empty string. */
const normalise = (value: string): string => value.replace(/\/+$/, '') || '/';

/** Absolute URLs, protocol-relative URLs, fragments and queries own their own resolution. */
const isAlreadyResolved = (path: string): boolean =>
  /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.startsWith('#') || path.startsWith('?');

/** Join a site-root path onto a base path. */
export function joinBase(base: string, path: string): string {
  const prefix = base.replace(/\/+$/, '');
  return path === '/' ? `${prefix}/` : `${prefix}${path}`;
}

/**
 * Resolve any URL a template emits.
 *
 * Leaves anything that already resolves itself untouched, which matters for
 * media: a gallery photo's URL points at Google Drive, and prefixing it with
 * the site's base path would break it.
 */
export function withBase(base: string, path: string): string {
  if (isAlreadyResolved(path)) return path;
  if (!path.startsWith('/')) return path;
  return joinBase(base, path);
}

/** True when `href` is the current page, tolerating trailing slashes. */
export function isCurrentPath(base: string, href: string, pathname: string): boolean {
  return normalise(joinBase(base, href)) === normalise(pathname);
}

/** The configured base path, defaulting to the site root outside Astro. */
export const siteBase = (): string => import.meta.env?.BASE_URL ?? '/';

/** Resolve a URL against the configured base. Use for every href and src. */
export const url = (path: string): string => withBase(siteBase(), path);

export const isCurrent = (href: string, pathname: string): boolean =>
  isCurrentPath(siteBase(), href, pathname);
