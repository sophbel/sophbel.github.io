/**
 * Site details, validated at build time.
 *
 * `src/data/site.json` is edited through the CMS, so it gets the same treatment
 * as any other content: parsed against the shared spec, and the build fails
 * loudly rather than rendering a page with a missing name.
 */
import raw from '../data/site.json' with { type: 'json' };
import { fileCollections } from '../schema/collections.ts';
import { toZod } from '../schema/generate.ts';

const siteFields = fileCollections
  .find((collection) => collection.name === 'settings')!
  .files.find((file) => file.name === 'site')!.fields;

const parsed = toZod(siteFields).safeParse(raw);

if (!parsed.success) {
  throw new Error(
    `src/data/site.json does not match the site details schema:\n${JSON.stringify(parsed.error.issues, null, 2)}`,
  );
}

export interface SiteDetails {
  name: string;
  jobTitle: string;
  discipline: string;
  department: string;
  institution: string;
  labName: string;
  photo: string;
  email: string;
  office?: string;
  address?: string;
  orcid: string;
  github?: string;
  scholar?: string;
  /** Where the site's own source lives. Absent means no source affordances. */
  repo?: string;
}

export const site = parsed.data as unknown as SiteDetails;
