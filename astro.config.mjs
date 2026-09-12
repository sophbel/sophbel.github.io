// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// `base` lets the same build serve from a GitHub Pages project path
// (/belman-lab-demo) or from a domain root. Defaults to root for local dev.
const base = process.env.SITE_BASE ?? '/';
const site = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  base,
  // robots.txt points at the sitemap whenever a build is indexable; without
  // this that reference would be a 404.
  integrations: [sitemap()],
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
