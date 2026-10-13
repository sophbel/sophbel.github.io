import { describe, it, expect } from 'vitest';
import { publicationPreview } from '../src/admin/publication-preview.js';
import { buildPublicationModule } from '../scripts/browser-publications.ts';
import * as lib from '../src/lib/publications.ts';

/**
 * The editor's preview is a React component drawn with Sveltia's `h`. Here `h`
 * is a stand-in that builds a plain tree, so the component's output can be
 * read without a browser.
 */
interface Node {
  tag: string;
  props: Record<string, unknown>;
  children: unknown[];
}

const h = (tag: unknown, props: Record<string, unknown> | null, ...children: unknown[]): unknown =>
  typeof tag === 'function'
    ? (tag as (p: unknown) => unknown)({ ...props, children })
    : ({ tag: String(tag), props: props ?? {}, children: children.flat() } satisfies Node);

const text = (node: unknown): string =>
  node === null || node === undefined
    ? ''
    : typeof node === 'object'
      ? (node as Node).children.map(text).join(' ')
      : String(node);

function find(node: unknown, test: (node: Node) => boolean, found: Node[] = []): Node[] {
  if (node && typeof node === 'object') {
    if (test(node as Node)) found.push(node as Node);
    for (const child of (node as Node).children) find(child, test, found);
  }
  return found;
}

const NAME = 'Sophie Belman';
const render = (rows: unknown[], getAsset?: (path: string) => unknown) =>
  publicationPreview(h as never, lib, NAME)({
    entry: { get: () => ({ toJS: () => ({ publications: rows }) }) },
    getAsset,
  }) as Node;

const bib = (title: string, body = 'year = {2024}') => `@article{k, title = {${title}}, author = {Belman, Sophie and Other, An}, ${body}}`;

describe('the publication preview', () => {
  it('draws the two lists the page does', () => {
    const tree = render([
      { bibtex: bib('Plain paper') },
      { bibtex: bib('Chosen paper'), selected: true },
    ]);
    const headings = find(tree, (n) => n.tag === 'h2').map(text);
    expect(headings).toEqual(['Selected publications', 'All publications']);
    const lists = find(tree, (n) => n.tag === 'ol');
    expect(lists).toHaveLength(2);
    expect(text(lists[0])).toContain('Chosen paper');
    expect(text(lists[0])).not.toContain('Plain paper');
    // "All" holds both.
    expect(text(lists[1])).toContain('Plain paper');
    expect(text(lists[1])).toContain('Chosen paper');
  });

  it('draws a selected paper’s picture with its description, and no picture in the full list', () => {
    const tree = render([
      { bibtex: bib('Pictured'), selected: true, image: '/uploads/fig.png', imageAlt: 'A map of spread' },
      { bibtex: bib('Plain'), image: '/uploads/other.png' },
    ]);
    const images = find(tree, (n) => n.tag === 'img');
    // Once, in the selected list: "All" never carries pictures, and the
    // unselected paper's picture is stored but not shown.
    expect(images).toHaveLength(1);
    expect(images[0]!.props.alt).toBe('A map of spread');
    expect(images[0]!.props.src).toBe('/uploads/fig.png');
  });

  it('marks a picture the editor made narrower or wider, and leaves the default unmarked', () => {
    const tree = render([
      { bibtex: bib('Half'), selected: true, image: '/uploads/a.png', imageScale: 'Half width' },
      { bibtex: bib('Full', 'year = {2023}'), selected: true, image: '/uploads/b.png', imageScale: 'Full width' },
      { bibtex: bib('Large', 'year = {2022}'), selected: true, image: '/uploads/c.png' },
    ]);
    const classes = find(tree, (n) => n.tag === 'figure').map((n) => n.props.className);
    expect(classes).toEqual(['pub__figure pub__figure--half', 'pub__figure pub__figure--full', 'pub__figure']);
  });

  it('shows the caption as text under the picture, and only with a picture', () => {
    const tree = render([
      { bibtex: bib('Pictured'), selected: true, image: '/uploads/fig.png', imageCaption: 'Monthly case counts, 2005 to 2023.' },
      { bibtex: bib('Caption only'), selected: true, imageCaption: 'Orphan caption' },
    ]);
    const captions = find(tree, (n) => n.tag === 'figcaption').map(text);
    expect(captions).toEqual(['Monthly case counts, 2005 to 2023.']);
  });

  it('shows a just-uploaded picture through the CMS’s own asset lookup', () => {
    const tree = render(
      [{ bibtex: bib('Pictured'), selected: true, image: '/uploads/fig.png' }],
      (path) => ({ url: `blob:preview${path}` }),
    );
    const [image] = find(tree, (n) => n.tag === 'img');
    expect(image!.props.src).toBe('blob:preview/uploads/fig.png');
    expect(image!.props.alt).toBe('');
  });

  it('draws no picture frame for a paper that has none', () => {
    const tree = render([{ bibtex: bib('Chosen'), selected: true }]);
    expect(find(tree, (n) => n.tag === 'figure')).toHaveLength(0);
  });

  it('leaves out the selected list when nothing is selected', () => {
    const tree = render([{ bibtex: bib('Plain paper') }]);
    expect(find(tree, (n) => n.tag === 'h2').map(text)).toEqual(['All publications']);
  });

  it('sorts newest first, as the page does', () => {
    const tree = render([
      { bibtex: bib('Old', 'year = {2001}') },
      { bibtex: bib('New', 'year = {2025}') },
    ]);
    const titles = find(tree, (n) => n.props.className === 'pub__title').map(text);
    expect(titles).toEqual(['New', 'Old']);
  });

  it('reads the BibTeX the way the site does: accents, authors, journal, year, preprint', () => {
    const tree = render([
      { bibtex: "@article{k, title={The {DNA} of it}, author={Gonz{\\'a}lez, Aida}, journal={Nature}, year={2024}}" },
      { bibtex: '@article{k, title={A preprint}, author={Other, An}, journal={bioRxiv}, year={2023}}' },
    ]);
    const all = text(tree);
    expect(all).toContain('The DNA of it');
    expect(all).toContain('Aida González');
    expect(all).toContain('Nature');
    expect(find(tree, (n) => n.props.className === 'tag').map(text)).toEqual(['Preprint']);
  });

  it('picks her name out in bold, and keeps it visible past the author limit', () => {
    const authors = ['A', 'B', 'C', 'D', 'E', 'F', 'G', NAME].join(' and ');
    const tree = render([{ bibtex: `@article{k, title={T}, author={${authors}}, year={2024}}` }]);
    expect(find(tree, (n) => n.tag === 'strong').map(text)).toEqual([NAME]);
    expect(text(find(tree, (n) => n.props.className === 'pub__authors')[0])).toContain('et al.');
  });

  it('links a title only to an http(s) address', () => {
    const tree = render([
      { bibtex: bib('Safe', 'year = {2024}, url = {https://example.org/p}') },
      { bibtex: bib('Unsafe', 'year = {2023}, url = {javascript:alert(1)}') },
    ]);
    const links = find(tree, (n) => n.tag === 'a');
    expect(links.map((n) => n.props.href)).toEqual(['https://example.org/p']);
  });

  it('says which row cannot be read, and why, instead of drawing it wrong', () => {
    const tree = render([
      { bibtex: bib('Fine') },
      { bibtex: 'Belman S. 2024. A paper.' },
      { bibtex: '@article{k, year = {2024}}' },
    ]);
    const problems = find(tree, (n) => n.props.className === 'pub pub--problem').map(text);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('Row 2');
    expect(problems[0]).toContain('no BibTeX entry');
    expect(problems[1]).toContain('Row 3');
    expect(problems[1]).toContain('no title');
    // The row that can be read is still drawn.
    expect(text(tree)).toContain('Fine');
  });

  it('asks for a paste when a new row is still empty', () => {
    const tree = render([{ bibtex: '' }, {}]);
    const problems = find(tree, (n) => n.props.className === 'pub pub--problem').map(text);
    expect(problems.every((p) => p.includes('Paste a BibTeX entry'))).toBe(true);
  });

  it('copes with a list that has no rows at all', () => {
    const tree = render([]);
    expect(find(tree, (n) => n.tag === 'h2').map(text)).toEqual(['All publications']);
  });
});

describe('the browser module built from src/lib', () => {
  const source = buildPublicationModule();

  it('has no imports left, so the admin page can load it on its own', () => {
    expect(source).not.toMatch(/^import /m);
  });

  it('reads an entry exactly as the site does', async () => {
    const browser = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const row = {
      bibtex: "@article{k, title={The {DNA} of it}, author={Gonz{\\'a}lez, Aida and others}, journal={Nature}, year={2024}, doi={10.1/x}}",
      selected: true,
    };
    expect(browser.toPublication(row)).toEqual(lib.toPublication(row));
    expect(typeof browser.sortPublications).toBe('function');
    expect(typeof browser.formatAuthors).toBe('function');
  });
});
