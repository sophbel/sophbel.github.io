import { describe, it, expect } from 'vitest';
import {
  formatAuthors,
  publicationLists,
  sortPublications,
  toPublication,
  type PublicationData,
} from '../src/lib/publications.ts';
import { publicationEntries } from '../src/lib/publication-data.ts';
import { PUBLICATION_FIELDS, collections } from '../src/schema/collections.ts';
import { toZod } from '../src/schema/generate.ts';

/** A row holding a minimal BibTeX entry, identified in assertions by its title. */
const bib = (title: string, fields = '', year: string | null = '2024') =>
  `@article{k, title={${title}}, author={A. Author}${year ? `, year={${year}}` : ''}${fields ? `, ${fields}` : ''}}`;

const pub = (title: string, over: Partial<PublicationData> & { fields?: string; year?: string | null } = {}) => {
  const { fields, year, ...rest } = over;
  return toPublication({ bibtex: bib(title, fields, year === undefined ? '2024' : year), ...rest });
};

describe('toPublication', () => {
  it('reads the title, year, authors and journal from the BibTeX', () => {
    const p = toPublication({
      bibtex: "@article{k, title={The {DNA} of it}, author={Belman, Sophie and Gonz{\\'a}lez, Aida}, journal={Nature}, year={2024}}",
    });
    expect(p).toMatchObject({
      title: 'The DNA of it',
      year: 2024,
      authors: ['Sophie Belman', 'Aida González'],
      journal: 'Nature',
      isPreprint: false,
    });
  });

  it('links the title to the DOI when the entry has no link of its own', () => {
    expect(pub('a', { fields: 'doi={10.1/x}' }).url).toBe('https://doi.org/10.1/x');
  });

  it('prefers the entry’s own link to the DOI', () => {
    expect(pub('a', { fields: 'doi={10.1/x}, url={https://example.org/p}' }).url).toBe('https://example.org/p');
  });

  it('has no link when it has neither', () => {
    expect(pub('a').url).toBeNull();
  });

  it('accepts a DOI written as a resolver link, and stores the bare identifier', () => {
    expect(pub('a', { fields: 'doi={https://doi.org/10.1/x}' }).doi).toBe('10.1/x');
    expect(pub('a', { fields: 'doi={http://dx.doi.org/10.1/x}' }).doi).toBe('10.1/x');
  });

  it('has a null year rather than NaN when the entry carries none', () => {
    expect(pub('a', { year: null }).year).toBeNull();
    expect(pub('a', { year: 'in press' }).year).toBeNull();
  });

  it('recognises a preprint by its server, and drops the server from the journal', () => {
    const p = pub('a', { fields: 'journal={Preprint, medrxiv}' });
    expect(p).toMatchObject({ isPreprint: true, journal: null });
    expect(pub('a', { fields: 'journal={bioRxiv}' }).isPreprint).toBe(true);
    expect(pub('a', { fields: 'journal={Available at SSRN 6400926}' }).isPreprint).toBe(true);
  });

  it('does not take a journal for a preprint', () => {
    expect(pub('a', { fields: 'journal={Nature Microbiology}' }).isPreprint).toBe(false);
  });

  it('honours the Preprint tick when the entry does not say so', () => {
    expect(pub('a', { preprint: true, fields: 'journal={Some Journal}' })).toMatchObject({ isPreprint: true, journal: null });
  });

  it('takes a conference or thesis venue as the journal line', () => {
    const talk = toPublication({ bibtex: '@inproceedings{k, title={T}, booktitle={ARTHRITIS \\& RHEUMATOLOGY}, year={2020}}' });
    expect(talk.journal).toBe('ARTHRITIS & RHEUMATOLOGY');
    const thesis = toPublication({ bibtex: '@phdthesis{k, title={T}, school={University of Cambridge}, year={2023}}' });
    expect(thesis.journal).toBe('PhD thesis, University of Cambridge');
    expect(toPublication({ bibtex: '@phdthesis{k, title={T}, year={2023}}' }).journal).toBe('PhD thesis');
  });

  it('reads the image width the editor chose, and calls anything else, or nothing, large', () => {
    expect(pub('a').imageScale).toBe('large');
    expect(pub('a', { imageScale: 'Half width' }).imageScale).toBe('half');
    expect(pub('a', { imageScale: 'Large' }).imageScale).toBe('large');
    expect(pub('a', { imageScale: 'Full width' }).imageScale).toBe('full');
    expect(pub('a', { imageScale: 'Enormous' }).imageScale).toBe('large');
  });

  it('defaults the flag to false and the image to null, and carries them through when set', () => {
    expect(pub('a')).toMatchObject({ selected: false, image: null, imageAlt: null, imageCaption: null });
    expect(pub('a', { selected: true })).toMatchObject({ selected: true });
    expect(pub('a', { image: '/uploads/fig.png', imageAlt: 'A map', imageCaption: 'Fig. 1' })).toMatchObject({
      image: '/uploads/fig.png',
      imageAlt: 'A map',
      imageCaption: 'Fig. 1',
    });
  });

  it('says what is wrong when the BibTeX is not usable', () => {
    expect(() => toPublication({ bibtex: 'Belman S. 2024. A paper.' })).toThrow(/no BibTeX entry/);
    expect(() => toPublication({ bibtex: '@article{a, title={A}}\n@article{b, title={B}}' })).toThrow(/2 BibTeX entries/);
    expect(() => toPublication({ bibtex: '@article{a, year={2024}}' })).toThrow(/no title/);
  });
});

describe('sortPublications', () => {
  it('sorts newest first and breaks ties alphabetically', () => {
    const sorted = sortPublications([
      pub('Z', { year: '2020' }),
      pub('B'),
      pub('A'),
    ]);
    expect(sorted.map((p) => p.title)).toEqual(['A', 'B', 'Z']);
  });

  it('puts an entry with no year last', () => {
    const sorted = sortPublications([pub('Undated', { year: null }), pub('Old', { year: '1999' })]);
    expect(sorted.map((p) => p.title)).toEqual(['Old', 'Undated']);
  });

  it('does not reorder its input', () => {
    const input = [pub('x', { year: '2020' }), pub('y')];
    sortPublications(input);
    expect(input.map((p) => p.title)).toEqual(['x', 'y']);
  });
});

describe('publicationLists', () => {
  const lists = publicationLists([
    pub('plain', { year: '2022' }),
    pub('chosen-old', { year: '2021', selected: true }),
    pub('chosen-new', { selected: true }),
  ]);

  it('puts every entry in "all", selected ones included', () => {
    expect(lists.all.map((p) => p.title)).toEqual(['chosen-new', 'plain', 'chosen-old']);
  });

  it('puts only the selected entries in "selected", newest first', () => {
    expect(lists.selected.map((p) => p.title)).toEqual(['chosen-new', 'chosen-old']);
  });

  it('yields an empty selected list when nothing is selected', () => {
    expect(publicationLists([pub('a')]).selected).toEqual([]);
  });
});

describe('formatAuthors', () => {
  const names = ['A', 'B', 'C', 'D', 'E'];

  it('lists every author when under the limit', () => {
    expect(formatAuthors(names, { max: 6 })).toEqual({ shown: names, truncated: false });
  });

  it('truncates a long author list', () => {
    expect(formatAuthors(names, { max: 2 })).toEqual({ shown: ['A', 'B'], truncated: true });
  });

  it('keeps the emphasised author visible even past the limit', () => {
    expect(formatAuthors(names, { max: 2, emphasise: 'E' }).shown).toEqual(['A', 'B', 'E']);
  });

  it('does not duplicate the emphasised author when already shown', () => {
    expect(formatAuthors(names, { max: 2, emphasise: 'A' }).shown).toEqual(['A', 'B']);
  });

  it('handles an empty author list', () => {
    expect(formatAuthors([], { max: 6 })).toEqual({ shown: [], truncated: false });
  });
});

describe('the publication schema', () => {
  it('keeps the image width through validation, instead of dropping it as unknown', () => {
    const row = { bibtex: '@article{k, title={T}}', imageScale: 'Half width' };
    expect(toZod(PUBLICATION_FIELDS).parse(row)).toMatchObject({ imageScale: 'Half width' });
  });

  it('accepts a row as the CMS saves it, with every optional field left empty', () => {
    // Sveltia writes "" for an untouched optional select, which once broke the live build.
    const row = { bibtex: '@article{k, title={T}}', preprint: false, selected: false, image: '', imageScale: '', imageAlt: '', imageCaption: '' };
    expect(() => toZod(PUBLICATION_FIELDS).parse(row)).not.toThrow();
    expect(toPublication(row)).toMatchObject({ imageScale: 'large', image: null });
  });

  it('still rejects a width that is not one of the options', () => {
    expect(() => toZod(PUBLICATION_FIELDS).parse({ bibtex: 'x', imageScale: 'Huge' })).toThrow();
  });

  it('does not offer the image width on the folder collections, whose pages have no such setting', () => {
    const offered = collections.filter((c) => c.fields.some((f) => f.name === 'imageScale')).map((c) => c.name);
    expect(offered).toEqual([]);
  });
});

describe('the committed publication list', () => {
  it('has entries', () => {
    expect(publicationEntries.length).toBeGreaterThan(0);
  });

  it('gives every entry a title', () => {
    for (const entry of publicationEntries) expect(entry.title.trim()).not.toBe('');
  });

  it('no DOI appears twice', () => {
    const dois = publicationEntries.flatMap((entry) => (entry.doi ? [entry.doi.toLowerCase()] : []));
    expect(new Set(dois).size).toBe(dois.length);
  });

  it('keeps every entry in "all", with the selected ones also in "selected"', () => {
    const { all, selected } = publicationLists(publicationEntries);
    expect(all).toHaveLength(publicationEntries.length);
    expect(selected.every((entry) => all.includes(entry))).toBe(true);
  });
});
