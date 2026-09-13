/**
 * Turn a committed ORCID snapshot into a publication list fit to render.
 *
 * Everything here is pure: the network call lives in `scripts/fetch-orcid.ts`,
 * so the rendering rules can be tested without touching ORCID.
 */

export interface SnapshotWork {
  putCode: number;
  title: string;
  type: string | null;
  year: string | null;
  journal: string | null;
  doi: string | null;
  url: string | null;
  authors: string[];
}

export interface Snapshot {
  orcid: string;
  fetchedAt: string;
  works: SnapshotWork[];
}

export interface Publication {
  /** DOI where there is one, else the ORCID put-code. Stable across syncs. */
  id: string;
  title: string;
  year: number | null;
  journal: string | null;
  doi: string | null;
  url: string | null;
  authors: string[];
  isPreprint: boolean;
  /**
   * Id of the published article that carries the same title, when this is a
   * preprint. Lets a page hide the preprint without discarding the record.
   */
  supersededBy: string | null;
}

export interface PublicationList {
  /** When the snapshot was taken, so the page can show its own staleness. */
  syncedAt: string;
  publications: Publication[];
}

/**
 * Crossref strips italic markup from titles without replacing the surrounding
 * space, so `<i>Streptococcus pneumoniae</i>` leaves the species name fused to
 * its neighbours. Re-split on a lowercase-to-uppercase boundary, but only when
 * the capital starts a word — `SARS-CoV-2` and `PCV13` must survive untouched.
 */
export function repairTitle(title: string): string {
  return title
    .replace(/([a-z])([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
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

/**
 * Whether two fetches describe the same set of works.
 *
 * Lets the sync skip rewriting the snapshot when nothing has changed, so a
 * daily check does not produce a daily commit, a daily rebuild, and a
 * "last updated" date that moves every morning while saying nothing new.
 *
 * Order is ignored: ORCID does not promise a stable order, and a reshuffle is
 * not a change worth republishing the site for.
 */
export function worksEqual(a: SnapshotWork[], b: SnapshotWork[]): boolean {
  if (a.length !== b.length) return false;

  const byPutCode = (works: SnapshotWork[]) =>
    [...works].sort((x, y) => x.putCode - y.putCode).map((work) => JSON.stringify(work));

  const left = byPutCode(a);
  const right = byPutCode(b);
  return left.every((work, index) => work === right[index]);
}

/**
 * ORCID hands back whatever URL the source registered, and one of Crossref's
 * is still `http://dx.doi.org/...` - the pre-2016 spelling of the resolver.
 * It reaches the paper, by a redirect, and in the meantime it is the one
 * insecure link on the site. Both halves are safe to rewrite: `dx.doi.org` is
 * an alias of `doi.org`, and neither has served plain HTTP for years.
 *
 * Deliberately narrow. Upgrading every `http://` a record might carry assumes
 * something about hosts we have never seen; this assumes something about two
 * we have.
 */
export function repairUrl(url: string | null): string | null {
  return url === null
    ? null
    : url.replace(/^http:\/\/(dx\.)?doi\.org\//i, 'https://doi.org/');
}

/** Comparison key for matching two records of the same work. */
const titleKey = (title: string): string => title.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A work known to be absent from the ORCID record.
 *
 * ORCID is the source of truth for the publication list, so anything not on it
 * simply does not appear. Naming the known gaps on the page turns an invisible
 * omission into a visible, actionable list.
 */
export interface MissingWork {
  title: string;
  venue: string;
  year: number | null;
}

/**
 * Filter a hand-maintained "known missing" list down to those still absent.
 *
 * This makes the list self-healing: as works are added to ORCID they drop off
 * the gap list automatically, so the page cannot end up claiming a paper is
 * missing after it has been fixed.
 */
export function stillMissing(publications: Publication[], claimed: MissingWork[]): MissingWork[] {
  const present = new Set(publications.map((publication) => titleKey(publication.title)));
  return claimed.filter((work) => !present.has(titleKey(work.title)));
}

export function normalisePublications(snapshot: Snapshot): PublicationList {
  const seen = new Set<string>();
  const publications: Publication[] = [];

  for (const work of snapshot.works) {
    const id = work.doi ?? String(work.putCode);
    if (seen.has(id)) continue;
    seen.add(id);

    const year = work.year === null ? null : Number.parseInt(work.year, 10);
    publications.push({
      id,
      title: repairTitle(work.title),
      year: year === null || Number.isNaN(year) ? null : year,
      journal: work.journal,
      doi: work.doi,
      url: repairUrl(work.url),
      authors: work.authors,
      isPreprint: work.type === 'preprint',
      supersededBy: null,
    });
  }

  // A preprint whose title matches a published article is the same work twice.
  // Record the link rather than dropping it, so the page decides what to show.
  const publishedByTitle = new Map(
    publications.filter((p) => !p.isPreprint).map((p) => [titleKey(p.title), p.id]),
  );
  for (const publication of publications) {
    if (!publication.isPreprint) continue;
    publication.supersededBy = publishedByTitle.get(titleKey(publication.title)) ?? null;
  }

  publications.sort(
    (a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity) || a.title.localeCompare(b.title),
  );

  return { syncedAt: snapshot.fetchedAt, publications };
}
