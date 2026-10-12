import { describe, it, expect } from 'vitest';
import { decodeLatex, parseBibAuthors, parseBibtex } from '../src/lib/bibtex.ts';

// Lifted from a real Google Scholar export, accents and all.
const SCHOLAR = `@article{calvo2024evolution,
  title={Evolution of invasive pneumococcal disease by serotype 3 in adults: a Spanish three-decade retrospective study},
  author={Calvo-Silveria, Sara and Gonz{\\'a}lez-D{\\'\\i}az, Aida and Grau, Inmaculada and Belman, Sophie and others},
  journal={The Lancet Regional Health--Europe},
  volume={46},
  year={2024},
  publisher={Elsevier}
}

@inproceedings{walsh2020genomic,
  title={Genomic, Phenomic, Proteomic Predictors of Psoriatic Arthritis},
  author={Walsh, Jessica and Belman, Sophie},
  booktitle={ARTHRITIS \\& RHEUMATOLOGY},
  year={2020}
}`;

describe('parseBibtex', () => {
  it('reads every entry, with its type, key and fields', () => {
    const entries = parseBibtex(SCHOLAR);
    expect(entries.map((e) => [e.type, e.key])).toEqual([
      ['article', 'calvo2024evolution'],
      ['inproceedings', 'walsh2020genomic'],
    ]);
    expect(entries[0]!.fields.year).toBe('2024');
    expect(entries[0]!.fields.journal).toBe('The Lancet Regional Health--Europe');
  });

  it('reads quoted values, bare numbers and parenthesised entries', () => {
    const [entry] = parseBibtex('@Article(k, Title = "A {Title}", year = 2021)');
    expect(entry).toMatchObject({ type: 'article', key: 'k' });
    expect(entry!.fields.title).toBe('A {Title}');
    expect(entry!.fields.year).toBe('2021');
  });

  it('keeps nested braces inside a value', () => {
    const [entry] = parseBibtex('@article{k, title = {The {DNA} of {S}. pneumoniae}}');
    expect(entry!.fields.title).toBe('The {DNA} of {S}. pneumoniae');
  });

  it('ignores text before the entry and @comment blocks', () => {
    const entries = parseBibtex('% saved from somewhere\n@comment{ignore {me}}\n@article{k, title={T}}');
    expect(entries.map((e) => e.key)).toEqual(['k']);
  });

  it('returns nothing for text with no entry', () => {
    expect(parseBibtex('just some words')).toEqual([]);
    expect(parseBibtex('')).toEqual([]);
  });

  it('throws, with a sentence, on an unclosed entry', () => {
    expect(() => parseBibtex('@article{k, title = {Never closed')).toThrow(/never closed/);
    expect(() => parseBibtex('@article{k, title = {T}')).toThrow(/never closed/);
  });
});

describe('decodeLatex', () => {
  it('turns accent commands into letters, braced or not', () => {
    expect(decodeLatex("Gonz{\\'a}lez-D{\\'\\i}az")).toBe('González-Díaz');
    expect(decodeLatex("No{\\'e}mie Lefrancq")).toBe('Noémie Lefrancq');
    expect(decodeLatex('Citro{\\"e}n')).toBe('Citroën');
    expect(decodeLatex("F{\\'e}lix and Fran\\c{c}ois")).toBe('Félix and François');
    expect(decodeLatex('{\\v{S}}koda')).toBe('Škoda');
  });

  it('handles the letters that are not accents', () => {
    expect(decodeLatex('Kj{\\o}rsvik, Stra{\\ss}e')).toBe('Kjørsvik, Straße');
  });

  it('unescapes the characters TeX reserves', () => {
    expect(decodeLatex('ARTHRITIS \\& RHEUMATOLOGY, 50\\% of \\#1')).toBe('ARTHRITIS & RHEUMATOLOGY, 50% of #1');
  });

  it('turns TeX dashes into real ones and drops case-protecting braces', () => {
    expect(decodeLatex('Health--Europe')).toBe('Health–Europe');
    expect(decodeLatex('The {DNA} of {S}. pneumoniae')).toBe('The DNA of S. pneumoniae');
  });

  it('leaves plain text and real unicode alone', () => {
    expect(decodeLatex('Daniela Lührsen')).toBe('Daniela Lührsen');
  });
});

describe('parseBibAuthors', () => {
  it('reads "Last, First" and "First Last" alike, in order', () => {
    expect(parseBibAuthors('Belman, Sophie and Henri Pesonen and Croucher, Nicholas J')).toEqual([
      'Sophie Belman',
      'Henri Pesonen',
      'Nicholas J Croucher',
    ]);
  });

  it('decodes accents and drops Scholar’s "and others"', () => {
    expect(parseBibAuthors("Gonz{\\'a}lez-D{\\'\\i}az, Aida and Belman, Sophie and others")).toEqual([
      'Aida González-Díaz',
      'Sophie Belman',
    ]);
  });

  it('copes with a list broken across lines', () => {
    expect(parseBibAuthors('A, One\n  and B, Two')).toEqual(['One A', 'Two B']);
  });

  it('gives an empty list for nothing', () => {
    expect(parseBibAuthors(undefined)).toEqual([]);
    expect(parseBibAuthors('')).toEqual([]);
  });
});
