// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The site is served from the root of sophbel.github.io, so `base` is empty
// in practice. It stays because a project path is one env var away - a move
// to a custom domain, or a staging copy under a subdirectory - and because
// dropping it would quietly delete the machinery in `src/lib/paths.ts` that
// keeps every URL going through one helper.
const base = process.env.SITE_BASE ?? '/';
const site = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  base,
  // robots.txt points at the sitemap whenever a build is indexable; without
  // this that reference would be a 404.
  //
  // /how-this-works is filtered out for the same reason the page sets
  // `noindex`: it is the manual, written for her rather than for visitors.
  // Listing a noindex page in the sitemap asks a crawler to fetch a page and
  // then tells it to forget what it found.
  integrations: [sitemap({ filter: (page) => !page.includes('/how-this-works') })],
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
