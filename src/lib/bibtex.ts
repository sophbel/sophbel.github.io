/**
 * A small BibTeX reader, enough for what Google Scholar, Crossref and a
 * reference manager export: entries with braced or quoted fields, LaTeX
 * accents in names, and `and`-separated author lists.
 *
 * It is not a TeX engine. Macros it does not know are left as written rather
 * than guessed at, so a surprising entry prints visibly wrong instead of
 * quietly wrong.
 */

export interface BibEntry {
  /** Lower-cased entry type: `article`, `inproceedings`, `phdthesis`... */
  type: string;
  key: string;
  /** Field name (lower-cased) to the raw value, braces and LaTeX intact. */
  fields: Record<string, string>;
}

const NON_ENTRIES = new Set(['comment', 'string', 'preamble']);

/** Index just past the brace that closes the one at `start`, which must be `{`. */
function endOfBraces(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') i++;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  throw new Error('a { in the BibTeX is never closed');
}

/** Read one field value starting at `i`; returns its text and where it ended. */
function readValue(text: string, i: number, close: string): [string, number] {
  if (text[i] === '{') {
    const end = endOfBraces(text, i);
    return [text.slice(i + 1, end - 1), end];
  }
  if (text[i] === '"') {
    let depth = 0;
    for (let j = i + 1; j < text.length; j++) {
      const ch = text[j];
      if (ch === '\\') j++;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '"' && depth === 0) return [text.slice(i + 1, j), j + 1];
    }
    throw new Error('a " in the BibTeX is never closed');
  }
  // A bare token: a number such as a year, or a @string macro name.
  let j = i;
  while (j < text.length && text[j] !== ',' && text[j] !== close && !/\s/.test(text[j]!)) j++;
  return [text.slice(i, j), j];
}

export function parseBibtex(text: string): BibEntry[] {
  const entries: BibEntry[] = [];
  let i = 0;

  while (i < text.length) {
    const at = text.indexOf('@', i);
    if (at === -1) break;
    const head = /^@\s*([A-Za-z]+)\s*([{(])/.exec(text.slice(at));
    if (!head) {
      i = at + 1;
      continue;
    }

    const type = head[1]!.toLowerCase();
    const close = head[2] === '{' ? '}' : ')';
    i = at + head[0].length;

    if (NON_ENTRIES.has(type)) {
      i = head[2] === '{' ? endOfBraces(text, i - 1) : text.indexOf(')', i) + 1 || text.length;
      continue;
    }

    const keyEnd = /[,}\)]/.exec(text.slice(i));
    if (!keyEnd) throw new Error(`the @${type} entry is never closed`);
    const key = text.slice(i, i + keyEnd.index).trim();
    i += keyEnd.index;

    const fields: Record<string, string> = {};
    for (;;) {
      while (i < text.length && /[\s,]/.test(text[i]!)) i++;
      if (i >= text.length) throw new Error(`the @${type} entry "${key}" is never closed`);
      if (text[i] === close) {
        i++;
        break;
      }
      const name = /^[A-Za-z0-9_:-]+/.exec(text.slice(i));
      if (!name) throw new Error(`cannot read a field name in "${key}" near "${text.slice(i, i + 20)}"`);
      i += name[0].length;
      while (/\s/.test(text[i] ?? '')) i++;
      if (text[i] !== '=') throw new Error(`the field "${name[0]}" in "${key}" has no =`);
      i++;
      while (/\s/.test(text[i] ?? '')) i++;
      const [value, next] = readValue(text, i, close);
      fields[name[0].toLowerCase()] = value;
      i = next;
    }
    entries.push({ type, key, fields });
  }

  return entries;
}

const COMBINING_SYMBOL: Record<string, string> = {
  "'": '́', '`': '̀', '^': '̂', '"': '̈', '~': '̃', '=': '̄', '.': '̇',
};
const COMBINING_LETTER: Record<string, string> = {
  c: '̧', v: '̌', u: '̆', H: '̋', k: '̨',
};
const LETTERS: Record<string, string> = {
  o: 'ø', O: 'Ø', aa: 'å', AA: 'Å', ae: 'æ', AE: 'Æ', ss: 'ß', l: 'ł', L: 'Ł', i: 'i', j: 'j',
};

/** LaTeX to plain text: accents become letters, `\&` becomes `&`, braces go. */
export function decodeLatex(raw: string): string {
  const base = (letter: string) => LETTERS[letter.replace(/^\\/, '')] ?? letter.replace(/^\\/, '');
  return raw
    .replace(/\\(['`^"~=.])\s*(?:\{\s*(\\?[A-Za-z]+)\s*\}|(\\?[A-Za-z]))/g, (_m, accent: string, a?: string, b?: string) =>
      base((a ?? b)!) + COMBINING_SYMBOL[accent],
    )
    .replace(/\\([cvuHk])\s*(?:\{\s*([A-Za-z])\s*\}|\s+([A-Za-z]))/g, (_m, accent: string, a?: string, b?: string) =>
      (a ?? b)! + COMBINING_LETTER[accent],
    )
    .replace(/\\(o|O|aa|AA|ae|AE|ss|l|L)(?![A-Za-z])\s?/g, (_m, name: string) => LETTERS[name]!)
    .replace(/\\([&%$#_{}])/g, '$1')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/~/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}

/**
 * `Last, First and First Last` to display names in the order given. A trailing
 * `and others`, which is how Scholar marks a truncated list, is dropped.
 */
export function parseBibAuthors(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\s+and\s+/i)
    .map((author) => {
      const name = decodeLatex(author);
      const comma = name.indexOf(',');
      return comma === -1 ? name : `${name.slice(comma + 1).trim()} ${name.slice(0, comma).trim()}`.trim();
    })
    .filter((name) => name.length > 0 && name.toLowerCase() !== 'others');
}
