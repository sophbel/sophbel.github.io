/**
 * The publication list, validated at build time.
 *
 * `src/data/publications.json` is edited through the CMS, so it gets the same
 * treatment as the site details: parsed against the shared spec, and the build
 * fails loudly on a bad entry rather than printing half a citation.
 */
import raw from '../data/publications.json' with { type: 'json' };
import { fileCollections } from '../schema/collections.ts';
import { toZod } from '../schema/generate.ts';
import { uploadSize } from './uploads.ts';
import { toPublication, type Publication, type PublicationData } from './publications.ts';

const fields = fileCollections
  .find((collection) => collection.name === 'publications')!
  .files.find((file) => file.name === 'publications')!.fields;

const parsed = toZod(fields).safeParse(raw);

if (!parsed.success) {
  throw new Error(
    `src/data/publications.json does not match the publication schema:\n${JSON.stringify(parsed.error.issues, null, 2)}`,
  );
}

const rows = (parsed.data as { publications: PublicationData[] }).publications;

export const publicationEntries: Publication[] = rows.map((row, index) => {
  try {
    return toPublication(row);
  } catch (error) {
    // A row has no title to name it by until its BibTeX has been read.
    const first = row.bibtex.split('\n')[0]?.slice(0, 60);
    throw new Error(`src/data/publications.json, row ${index + 1} (${first}): ${(error as Error).message}`);
  }
});

/** Give a picture its real size, so the page can hold its shape before it loads. */
function withImageSize(publication: Publication): Publication {
  if (!publication.image) return publication;
  const size = uploadSize(publication.image, publication.title);
  return { ...publication, imageWidth: size?.width ?? null, imageHeight: size?.height ?? null };
}

export const publicationsWithSizes: Publication[] = publicationEntries.map(withImageSize);
