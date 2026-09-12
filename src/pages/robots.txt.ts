import type { APIRoute } from 'astro';
import { isIndexable } from '../lib/env.ts';
import { url } from '../lib/paths.ts';

/**
 * The demo carries invented lab members alongside a real academic's name and
 * photo. Letting a search engine index that is a bad idea, so indexing is
 * opt-in rather than opt-out: a build only allows crawling when it is
 * explicitly told to.
 */
export const GET: APIRoute = ({ site }) =>
  new Response(
    isIndexable
      ? // The base path matters here: the sitemap lives under it, not at the
        // domain root, whenever the site is served from a project path.
        `User-agent: *\nAllow: /\n\nSitemap: ${new URL(url('/sitemap-index.xml'), site)}\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
