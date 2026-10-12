/**
 * Turn the publication list into the two lists the page prints.
 *
 * Everything here is pure, so the ordering and selection rules can be tested
 * without building the site.
 */

import { decodeLatex, parseBibAuthors, parseBibtex } from './bibtex.ts';

export interface Publication {
  title: string;
  /** Null for an entry that carries no year, such as a talk; those sort last. */
  year: number | null;
  authors: string[];
  journal: string | null;
  doi: string | null;
  /** Where the title links to: the entry's own link, else its DOI, else nothing. */
  url: string | null;
  isPreprint: boolean;
  selected: boolean;
  /** Site path of an uploaded picture, drawn under the paper in the selected list. */
  image: string | null;
  imageAlt: string | null;
  /** The picture's own pixel size, filled in at build time so the page can reserve its space. */
  imageWidth: number | null;
  imageHeight: number | null;
  /** Visible text under the picture, such as the paper's own figure legend. */
  imageCaption: string | null;
}

/** One row of the publication list, as the content schema delivers it. */
export interface PublicationData {
  /** One BibTeX entry, as exported. */
  bibtex: string;
  preprint?: boolean;
  selected?: boolean;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
}

/** A DOI is an identifier; an editor may paste the whole resolver link. */
function bareDoi(doi: string): string {
  return doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
}

/** Servers where a paper sits before a journal has it, named in the entry's venue. */
const PREPRINT_VENUE = /preprint|arxiv|biorxiv|medrxiv|chemrxiv|ssrn|research\s*square/i;

/**
 * Read a row's BibTeX into the fields the page prints.
 *
 * Throws, naming the entry, when the BibTeX cannot be read or holds more than
 * one entry: a build that stops with a sentence is better than a page that
 * quietly prints half a citation.
 */
export function toPublication(data: PublicationData): Publication {
  const entries = parseBibtex(data.bibtex);
  if (entries.length !== 1) {
    throw new Error(
      entries.length === 0
        ? 'no BibTeX entry found (it should start with something like @article{...)'
        : `${entries.length} BibTeX entries found; put one entry in each row`,
    );
  }
  const { type, key, fields } = entries[0]!;

  const title = decodeLatex(fields.title ?? '');
  if (title === '') throw new Error(`the BibTeX entry "${key}" has no title`);

  const year = Number.parseInt(fields.year ?? fields.date ?? '', 10);
  const school = fields.school ? decodeLatex(fields.school) : '';
  const venue =
    type === 'phdthesis' || type === 'mastersthesis'
      ? `${type === 'phdthesis' ? 'PhD' : 'Master’s'} thesis${school ? `, ${school}` : ''}`
      : decodeLatex(fields.journal ?? fields.booktitle ?? fields.howpublished ?? fields.publisher ?? school);
  const isPreprint =
    data.preprint === true || type === 'unpublished' || PREPRINT_VENUE.test(venue);
  const doi = fields.doi ? bareDoi(decodeLatex(fields.doi)) : null;
  const url = fields.url ? decodeLatex(fields.url) : null;

  return {
    title,
    year: Number.isNaN(year) ? null : year,
    authors: parseBibAuthors(fields.author),
    // A preprint's "venue" is the server's name, which the Preprint tag already says.
    journal: isPreprint || venue === '' ? null : venue,
    doi,
    url: url ?? (doi ? `https://doi.org/${doi}` : null),
    isPreprint,
    selected: data.selected === true,
    image: data.image ?? null,
    imageAlt: data.imageAlt ?? null,
    imageWidth: null,
    imageHeight: null,
    imageCaption: data.imageCaption ?? null,
  };
}

/** Newest year first; within a year, alphabetical. Entries with no year go last. */
export function sortPublications(publications: Publication[]): Publication[] {
  return [...publications].sort(
    (a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity) || a.title.localeCompare(b.title),
  );
}

/**
 * The two lists. "All" holds every entry, selected ones included: it is the
 * record, and the selected list is a view onto it rather than a carve-out.
 */
export function publicationLists(publications: Publication[]): {
  selected: Publication[];
  all: Publication[];
} {
  const all = sortPublications(publications);
  return { all, selected: all.filter((publication) => publication.selected) };
}

export interface FormatAuthorsOptions {
  /** How many authors to show before truncating. */
  max: number;
  /** An author to keep visible even if the list is truncated before reaching them. */
  emphasise?: string;
}

export function formatAuthors(
  authors: string[],
  { max, emphasise }: FormatAuthorsOptions,
): { shown: string[]; truncated: boolean } {
  if (authors.length <= max) return { shown: [...authors], truncated: false };

  const shown = authors.slice(0, max);
  if (emphasise && authors.includes(emphasise) && !shown.includes(emphasise)) {
    shown.push(emphasise);
  }
  return { shown, truncated: true };
}
