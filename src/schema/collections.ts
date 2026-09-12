/**
 * The content model, described once.
 *
 * `scripts/generate-cms-config.ts` turns this into `public/admin/config.yml`
 * for Sveltia, and `src/content.config.ts` turns it into Zod schemas for Astro.
 * Change a field here and both follow.
 *
 * Content model shape adapted from fjd2004711/scholar-lite (MIT) - see CREDITS.md.
 */
import type { CollectionSpec, Field, FileCollectionSpec } from './fields.ts';

const body: Field = { name: 'body', label: 'Content', widget: 'markdown' };

/** Ranks drive the grouping and ordering of the team page. */
export const PERSON_RANKS = [
  'Principal Investigator',
  'Postdoc',
  'PhD Student',
  'Masters Student',
  'Undergraduate',
  'Staff',
  'Alumni',
] as const;

export const collections: CollectionSpec[] = [
  {
    name: 'pages',
    label: 'Pages',
    labelSingular: 'Page',
    folder: 'src/content/pages',
    fields: [
      { name: 'title', label: 'Title', widget: 'string', hint: 'Shown as the page heading and in the browser tab' },
      { name: 'order', label: 'Menu order', widget: 'number', hint: 'Lower numbers appear first in the navigation' },
      { name: 'showInNav', label: 'Show in navigation', widget: 'boolean' },
      { name: 'description', label: 'Search description', widget: 'text', required: false },
      body,
    ],
  },
  {
    name: 'people',
    label: 'People',
    labelSingular: 'Person',
    folder: 'src/content/people',
    fields: [
      { name: 'name', label: 'Full name', widget: 'string' },
      { name: 'rank', label: 'Position', widget: 'select', options: [...PERSON_RANKS] },
      { name: 'order', label: 'Order within position', widget: 'number', hint: 'Lower numbers appear first' },
      { name: 'photo', label: 'Photo', widget: 'image', required: false },
      { name: 'pronouns', label: 'Pronouns', widget: 'string', required: false },
      { name: 'email', label: 'Email', widget: 'string', required: false },
      { name: 'orcid', label: 'ORCID iD', widget: 'string', required: false, hint: 'Just the identifier, e.g. 0000-0002-9778-7174' },
      { name: 'github', label: 'GitHub username', widget: 'string', required: false },
      { name: 'website', label: 'Personal website', widget: 'string', required: false },
      { name: 'placeholder', label: 'Placeholder entry', widget: 'boolean', required: false, hint: 'Marks a demo entry that is not a real person' },
      body,
    ],
  },
  {
    name: 'news',
    label: 'News',
    labelSingular: 'News item',
    folder: 'src/content/news',
    demo: true,
    fields: [
      { name: 'title', label: 'Headline', widget: 'string' },
      { name: 'date', label: 'Date', widget: 'datetime' },
      { name: 'summary', label: 'Summary', widget: 'text', required: false },
      { name: 'image', label: 'Image', widget: 'image', required: false },
      { name: 'imageAlt', label: 'Image description', widget: 'string', required: false, hint: 'For screen readers. Leave blank if the image is purely decorative.' },
      body,
    ],
  },
  {
    name: 'projects',
    label: 'Projects',
    labelSingular: 'Project',
    folder: 'src/content/projects',
    demo: true,
    fields: [
      { name: 'title', label: 'Title', widget: 'string' },
      { name: 'summary', label: 'One-line summary', widget: 'text' },
      { name: 'order', label: 'Order', widget: 'number' },
      { name: 'image', label: 'Image', widget: 'image', required: false },
      { name: 'imageAlt', label: 'Image description', widget: 'string', required: false, hint: 'For screen readers. Leave blank if the image is purely decorative.' },
      { name: 'funder', label: 'Funder', widget: 'string', required: false },
      body,
    ],
  },
  {
    // Research code, named individually rather than hidden behind a GitHub
    // link. Everything here is real: the entries are her own repositories,
    // and each summary is the description she wrote on the repository itself.
    name: 'software',
    label: 'Software and data',
    labelSingular: 'Software entry',
    folder: 'src/content/software',
    fields: [
      { name: 'title', label: 'Name', widget: 'string' },
      { name: 'summary', label: 'One-line summary', widget: 'text' },
      { name: 'repo', label: 'Repository URL', widget: 'string', hint: 'e.g. https://github.com/sophbel/geomig_evo_pneumo' },
      { name: 'language', label: 'Main language', widget: 'string', required: false, hint: 'e.g. R, Python' },
      { name: 'doi', label: 'DOI of the paper it accompanies', widget: 'string', required: false, hint: 'Leave empty for code that stands on its own' },
      { name: 'order', label: 'Order', widget: 'number', hint: 'Lower numbers appear first' },
      body,
    ],
  },
  {
    name: 'highlights',
    // Must match the heading on the Publications page: an editor looking for
    // "Selected publications" should find it under that name.
    label: 'Selected publications',
    labelSingular: 'Selected publication',
    folder: 'src/content/highlights',
    fields: [
      { name: 'doi', label: 'DOI', widget: 'string', hint: 'e.g. 10.1038/s41586-024-07626-3 - must match a paper on your ORCID record' },
      { name: 'order', label: 'Order', widget: 'number' },
      { name: 'note', label: 'Why it matters', widget: 'text', required: false },
    ],
  },
];

/**
 * Single-file settings. A folder collection would let an editor create a second
 * "site details" entry, which is exactly the kind of mistake this shape
 * prevents.
 */
export const fileCollections: FileCollectionSpec[] = [
  {
    name: 'settings',
    label: 'Site details',
    files: [
      {
        name: 'site',
        label: 'Profile and footer',
        file: 'src/data/site.json',
        fields: [
          { name: 'name', label: 'Name', widget: 'string' },
          { name: 'jobTitle', label: 'Job title', widget: 'string' },
          { name: 'discipline', label: 'Discipline', widget: 'string', hint: 'e.g. Infectious Disease Epidemiologist' },
          { name: 'department', label: 'Department', widget: 'string' },
          { name: 'institution', label: 'Institution', widget: 'string' },
          { name: 'labName', label: 'Lab name', widget: 'string' },
          { name: 'photo', label: 'Profile photo', widget: 'image' },
          { name: 'email', label: 'Email', widget: 'string' },
          { name: 'office', label: 'Office', widget: 'string', required: false },
          { name: 'address', label: 'Postal address', widget: 'text', required: false },
          { name: 'orcid', label: 'ORCID iD', widget: 'string' },
          { name: 'github', label: 'GitHub username', widget: 'string', required: false },
          { name: 'scholar', label: 'Google Scholar user id', widget: 'string', required: false },
        ],
      },
    ],
  },
];
