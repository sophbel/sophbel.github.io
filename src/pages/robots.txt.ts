import type { APIRoute } from 'astro';
import { isIndexable } from '../lib/env.ts';
import { url } from '../lib/paths.ts';

/**
 * A build is crawlable unless it was told otherwise - see `isIndexable`,
 * which carries the reasoning for which way round that default goes.
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
