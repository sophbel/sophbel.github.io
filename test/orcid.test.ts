import { describe, it, expect } from 'vitest';
import {
  repairTitle,
  repairUrl,
  formatAuthors,
  normalisePublications,
  stillMissing,
  worksEqual,
  type Snapshot,
  type SnapshotWork,
} from '../src/lib/orcid.ts';
import realSnapshot from '../src/data/orcid-snapshot.json' with { type: 'json' };

/**
 * Behaviour is asserted against literals, not the committed record: running
 * `pnpm sync:orcid` must never be able to turn this suite red on its own.
 * The real record is exercised separately, and only for properties that hold
 * whatever it contains.
 */
const work = (over: Partial<SnapshotWork>): SnapshotWork => ({
  putCode: 1,
  title: 'A title',
  type: 'journal-article',
  year: '2024',
  journal: 'Journal',
  doi: '10.0000/a',
  url: 'https://doi.org/10.0000/a',
  authors: [],
  ...over,
});

const snapshotOf = (works: SnapshotWork[]): Snapshot => ({
  orcid: '0000-0000-0000-0000',
  fetchedAt: '2026-09-09T00:00:00.000Z',
  works,
});

describe('repairTitle', () => {
  it('restores spaces lost when Crossref strips italic markup', () => {
    expect(repairTitle('CharacterisingStreptococcus pneumoniaeTransmission Patterns in Malawi')).toBe(
      'Characterising Streptococcus pneumoniae Transmission Patterns in Malawi',
    );
  });

  it('leaves acronyms alone', () => {
    expect(repairTitle('SARS-CoV-2 genomics for disease mitigation in LMICs')).toBe(
      'SARS-CoV-2 genomics for disease mitigation in LMICs',
    );
    expect(repairTitle('Genetic background of isolates following PCV13')).toBe(
      'Genetic background of isolates following PCV13',
    );
  });

  it('collapses runs of whitespace and trims', () => {
    expect(repairTitle('  A  title\twith   gaps ')).toBe('A title with gaps');
  });

  it('is a no-op for an already clean title', () => {
    const clean = 'A new perspective on ancient Mitis group streptococcal genetics';
    expect(repairTitle(clean)).toBe(clean);
  });

  it('returns an empty string unchanged', () => {
    expect(repairTitle('')).toBe('');
  });
});

describe('repairUrl', () => {
  it('upgrades the old dx.doi.org resolver to https', () => {
    expect(repairUrl('http://dx.doi.org/10.1038/s41579-021-00664-y')).toBe(
      'https://doi.org/10.1038/s41579-021-00664-y',
    );
  });

  it('upgrades a plain http doi.org link', () => {
    expect(repairUrl('http://doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
  });

  it('leaves an https link alone', () => {
    const https = 'https://doi.org/10.1038/s41586-024-07626-3';
    expect(repairUrl(https)).toBe(https);
  });

  it('leaves a URL that is not the DOI resolver alone, http or not', () => {
    const elsewhere = 'http://example.org/paper';
    expect(repairUrl(elsewhere)).toBe(elsewhere);
  });

  it('passes a missing URL through', () => {
    expect(repairUrl(null)).toBe(null);
  });
});

describe('formatAuthors', () => {
  it('lists every author when under the limit', () => {
    expect(formatAuthors(['A One', 'B Two'], { max: 5 })).toEqual({ shown: ['A One', 'B Two'], truncated: false });
  });

  it('truncates a long author list', () => {
    expect(formatAuthors(['A', 'B', 'C', 'D'], { max: 2 })).toEqual({ shown: ['A', 'B'], truncated: true });
  });

  it('always keeps the emphasised author visible, even past the limit', () => {
    expect(formatAuthors(['A', 'B', 'C', 'Sophie Belman'], { max: 2, emphasise: 'Sophie Belman' })).toEqual({
      shown: ['A', 'B', 'Sophie Belman'],
      truncated: true,
    });
  });

  it('does not duplicate the emphasised author when already shown', () => {
    expect(formatAuthors(['Sophie Belman', 'B', 'C'], { max: 2, emphasise: 'Sophie Belman' })).toEqual({
      shown: ['Sophie Belman', 'B'],
      truncated: true,
    });
  });

  it('handles an empty author list', () => {
    expect(formatAuthors([], { max: 3 })).toEqual({ shown: [], truncated: false });
  });
});

describe('normalisePublications', () => {
  it('carries the sync date through so staleness is visible', () => {
    expect(normalisePublications(snapshotOf([])).syncedAt).toBe('2026-09-09T00:00:00.000Z');
  });

  it('repairs mangled titles', () => {
    const [only] = normalisePublications(
      snapshotOf([work({ title: 'CharacterisingStreptococcus pneumoniaeTransmission' })]),
    ).publications;
    expect(only?.title).toBe('Characterising Streptococcus pneumoniae Transmission');
  });

  it('sorts newest first, with undated works last', () => {
    const { publications } = normalisePublications(
      snapshotOf([
        work({ putCode: 1, doi: 'a', year: '2021' }),
        work({ putCode: 2, doi: 'b', year: null }),
        work({ putCode: 3, doi: 'c', year: '2024' }),
      ]),
    );
    expect(publications.map((p) => p.doi)).toEqual(['c', 'a', 'b']);
  });

  it('coerces the year to a number and an unparseable year to null', () => {
    const { publications } = normalisePublications(
      snapshotOf([work({ doi: 'a', year: '2024' }), work({ doi: 'b', year: 'not a year' })]),
    );
    expect(publications.find((p) => p.doi === 'a')?.year).toBe(2024);
    expect(publications.find((p) => p.doi === 'b')?.year).toBeNull();
  });

  it('flags preprints', () => {
    const { publications } = normalisePublications(
      snapshotOf([work({ doi: 'a', type: 'journal-article' }), work({ doi: 'b', type: 'preprint' })]),
    );
    expect(publications.find((p) => p.doi === 'a')?.isPreprint).toBe(false);
    expect(publications.find((p) => p.doi === 'b')?.isPreprint).toBe(true);
  });

  it('marks a preprint as superseded when a published version shares its title', () => {
    const { publications } = normalisePublications(
      snapshotOf([
        work({ doi: 'preprint', type: 'preprint', title: 'Estimating Between Country Migration', year: '2023' }),
        work({ doi: 'article', type: 'journal-article', title: 'Estimating between-country migration', year: '2024' }),
      ]),
    );
    expect(publications.find((p) => p.doi === 'preprint')?.supersededBy).toBe('article');
    expect(publications.find((p) => p.doi === 'article')?.supersededBy).toBeNull();
  });

  it('leaves a preprint with no published counterpart alone', () => {
    const [only] = normalisePublications(
      snapshotOf([work({ type: 'preprint', title: 'Only ever a preprint' })]),
    ).publications;
    expect(only?.supersededBy).toBeNull();
  });

  it('deduplicates repeated DOIs', () => {
    const duplicate = work({ doi: '10.0000/same' });
    expect(normalisePublications(snapshotOf([duplicate, { ...duplicate }])).publications).toHaveLength(1);
  });

  it('falls back to the put-code when there is no DOI', () => {
    const [only] = normalisePublications(
      snapshotOf([work({ putCode: 999, doi: null, year: null, authors: [] })]),
    ).publications;
    expect(only).toMatchObject({ id: '999', doi: null, year: null, authors: [] });
  });
});

describe('stillMissing', () => {
  const { publications } = normalisePublications(
    snapshotOf([work({ title: 'A new perspective on ancient Mitis group streptococcal genetics' })]),
  );

  it('drops a claimed-missing work once it appears on the record', () => {
    expect(
      stillMissing(publications, [
        { title: 'Emergence of a multidrug-resistant lineage', venue: 'The Lancet Microbe', year: 2022 },
        { title: 'A new perspective on ancient Mitis group streptococcal genetics', venue: 'x', year: 2022 },
      ]).map((w) => w.venue),
    ).toEqual(['The Lancet Microbe']);
  });

  it('matches regardless of case and punctuation', () => {
    expect(
      stillMissing(publications, [
        { title: 'A NEW PERSPECTIVE ON ANCIENT MITIS-GROUP STREPTOCOCCAL GENETICS!', venue: 'x', year: null },
      ]),
    ).toEqual([]);
  });

  it('keeps works that genuinely are not on the record', () => {
    const absent = [{ title: 'Something never published anywhere', venue: 'x', year: null }];
    expect(stillMissing(publications, absent)).toEqual(absent);
  });

  it('returns nothing for an empty claim list', () => {
    expect(stillMissing(publications, [])).toEqual([]);
  });
});

describe('the committed ORCID snapshot', () => {
  // Only properties that hold whatever the record currently contains, so a
  // re-sync cannot break the suite.
  const { publications, syncedAt } = normalisePublications(realSnapshot as Snapshot);

  it('parses without throwing and yields publications', () => {
    expect(publications.length).toBeGreaterThan(0);
  });

  it('gives every publication a unique, non-empty id', () => {
    const ids = publications.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it('yields a number or null for every year, never NaN', () => {
    expect(publications.every((p) => p.year === null || Number.isInteger(p.year))).toBe(true);
  });

  it('records a parseable sync date', () => {
    expect(Number.isNaN(new Date(syncedAt).getTime())).toBe(false);
  });

  it('never marks a published article as superseded', () => {
    expect(publications.filter((p) => !p.isPreprint).every((p) => p.supersededBy === null)).toBe(true);
  });
});

describe('worksEqual', () => {
  const a = work({ putCode: 1, doi: 'a' });
  const b = work({ putCode: 2, doi: 'b' });

  it('treats an identical record as unchanged', () => {
    expect(worksEqual([a, b], [{ ...a }, { ...b }])).toBe(true);
  });

  it('ignores ordering, which ORCID does not guarantee', () => {
    expect(worksEqual([a, b], [b, a])).toBe(true);
  });

  it('notices an edited field', () => {
    expect(worksEqual([a], [{ ...a, title: 'Retitled' }])).toBe(false);
  });

  it('notices an added or removed work', () => {
    expect(worksEqual([a], [a, b])).toBe(false);
    expect(worksEqual([a, b], [a])).toBe(false);
  });

  it('notices a changed author list', () => {
    expect(worksEqual([a], [{ ...a, authors: ['Someone New'] }])).toBe(false);
  });

  it('treats two empty records as unchanged', () => {
    expect(worksEqual([], [])).toBe(true);
  });
});
