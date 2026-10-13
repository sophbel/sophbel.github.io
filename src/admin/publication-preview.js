/**
 * The CMS preview for the publication list: what the Publications page will
 * print, drawn beside the form as the BibTeX is pasted.
 *
 * It takes `h` and the publication library as arguments rather than importing
 * them. In the editor `h` is Sveltia's own `createElement` and the library is
 * `publications-parse.js`, which `scripts/vendor-cms.ts` generates from
 * `src/lib` so the preview reads an entry with exactly the code the site does.
 * Handing them in is also what lets a test drive this file with a stand-in `h`.
 *
 * Text goes in as children, never as HTML, so an entry cannot inject markup.
 */

const MAX_AUTHORS = 6;

/** A link is only drawn for http(s); anything else renders as plain text. */
const safeUrl = (url) => (url && /^https?:\/\//i.test(url) ? url : undefined);

export function publicationPreview(h, lib, siteName) {
  const { toPublication, sortPublications, formatAuthors } = lib;

  /**
   * An image the editor has just uploaded is not on the site yet, so its path
   * means nothing here until the CMS has turned it into something loadable.
   */
  const imageSource = (getAsset, path) => {
    const asset = typeof getAsset === 'function' ? getAsset(path) : undefined;
    return (asset && (asset.url || String(asset))) || path;
  };

  function Authors({ authors }) {
    const { shown, truncated } = formatAuthors(authors, { max: MAX_AUTHORS, emphasise: siteName });
    if (shown.length === 0) return null;
    const parts = [];
    shown.forEach((name, index) => {
      if (index > 0) parts.push(', ');
      parts.push(name === siteName ? h('strong', { key: index }, name) : name);
    });
    if (truncated) parts.push(' et al.');
    return h('p', { className: 'pub__authors' }, ...parts);
  }

  function Entry({ publication, selected, getAsset }) {
    const href = safeUrl(publication.url);
    const meta = [];
    if (publication.journal) meta.push(h('em', { key: 'j' }, publication.journal));
    if (publication.year) meta.push((publication.journal ? ' · ' : '') + publication.year);
    if (publication.isPreprint) {
      meta.push((meta.length > 0 ? ' · ' : '') + '');
      meta.push(h('span', { key: 't', className: 'tag' }, 'Preprint'));
    }
    return h(
      'li',
      { className: 'pub' },
      h('p', { className: 'pub__year' }, publication.year ?? ''),
      h('p', { className: 'pub__title' }, href ? h('a', { href }, publication.title) : publication.title),
      h(Authors, { authors: publication.authors }),
      meta.length > 0 ? h('p', { className: 'pub__meta' }, ...meta) : null,
      selected && publication.image
        ? h(
            'figure',
            { className: 'pub__figure' + (publication.imageScale !== 'large' ? ' pub__figure--' + publication.imageScale : '') },
            h('img', { className: 'pub__image', src: imageSource(getAsset, publication.image), alt: publication.imageAlt || '' }),
            publication.imageCaption ? h('figcaption', { className: 'pub__caption' }, publication.imageCaption) : null,
          )
        : null,
    );
  }

  function Problem({ number, message }) {
    return h(
      'li',
      { className: 'pub pub--problem' },
      h('p', { className: 'pub__title' }, `Row ${number} cannot be shown yet`),
      h('p', { className: 'pub__authors' }, message),
    );
  }

  /** `selected` is the top list, the only one that carries pictures. */
  function List({ items, selected, getAsset }) {
    return h(
      'ol',
      { className: 'pubs' },
      ...items.map((publication, i) => h(Entry, { key: i, publication, selected, getAsset })),
    );
  }

  return function PublicationPreview({ entry, getAsset }) {
    const data = entry && entry.get ? entry.get('data') : undefined;
    const rows = ((data && data.toJS ? data.toJS() : data) || {}).publications || [];

    const publications = [];
    const problems = [];
    rows.forEach((row, index) => {
      try {
        publications.push(toPublication({ bibtex: '', ...row }));
      } catch (error) {
        const empty = !row.bibtex || row.bibtex.trim() === '';
        problems.push({ number: index + 1, message: empty ? 'Paste a BibTeX entry into this row.' : error.message });
      }
    });

    const all = sortPublications(publications);
    const selected = all.filter((publication) => publication.selected);

    return h(
      'div',
      { className: 'preview' },
      h('h1', null, 'Publications'),
      problems.length > 0
        ? h('ol', { className: 'pubs' }, ...problems.map((p) => h(Problem, { key: p.number, ...p })))
        : null,
      selected.length > 0 ? h('h2', null, 'Selected publications') : null,
      selected.length > 0 ? h(List, { items: selected, selected: true, getAsset }) : null,
      h('h2', null, 'All publications'),
      h(List, { items: all, selected: false, getAsset }),
    );
  };
}
