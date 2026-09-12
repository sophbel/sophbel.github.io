/**
 * Fetch an ORCID record into a committed snapshot.
 *
 * The snapshot is committed so builds are reproducible and offline: CI never
 * calls ORCID, and a publication list cannot change because someone else's
 * service had a bad day. Re-run this deliberately to pick up new work.
 *
 * Usage: pnpm sync:orcid
 */
import { readFile, writeFile } from 'node:fs/promises';
import { worksEqual, type Snapshot, type SnapshotWork } from '../src/lib/orcid.ts';

/**
 * Only the parts of ORCID's v3.0 payload this script reads. Every field is
 * optional because the record is someone else's data: works arrive with no
 * DOI, no year, and no contributors, and a missing field must produce `null`
 * rather than a crash at 3am.
 */
interface OrcidValue<T = string> {
  value?: T | null;
}
interface OrcidExternalId {
  'external-id-type'?: string | null;
  'external-id-value'?: string | null;
}
interface OrcidWorkSummary {
  'put-code'?: number | null;
  title?: { title?: OrcidValue | null } | null;
  type?: string | null;
  'publication-date'?: { year?: OrcidValue | null } | null;
  'journal-title'?: OrcidValue | null;
  'external-ids'?: { 'external-id'?: OrcidExternalId[] | null } | null;
  url?: OrcidValue | null;
}
interface OrcidWorksResponse {
  group?: { 'work-summary'?: OrcidWorkSummary[] | null }[] | null;
}
interface OrcidWorkDetail {
  contributors?: { contributor?: { 'credit-name'?: OrcidValue | null }[] | null } | null;
}

const ORCID = process.env.ORCID_ID ?? '0000-0002-9778-7174';
const API = 'https://pub.orcid.org/v3.0';
const OUT = new URL('../src/data/orcid-snapshot.json', import.meta.url);

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ORCID ${path} responded ${response.status}`);
  return (await response.json()) as T;
}

const works = await json<OrcidWorksResponse>(`/${ORCID}/works`);
const summaries = (works.group ?? []).flatMap((group) => group['work-summary']?.[0] ?? []);

const snapshotWorks: SnapshotWork[] = [];

// Author lists live only on the per-work endpoint, not the summary, so each
// work needs its own request. Sequential: ORCID is not ours to hammer.
for (const summary of summaries) {
  const putCode = summary['put-code'];
  if (typeof putCode !== 'number') continue;

  const detail = await json<OrcidWorkDetail>(`/${ORCID}/work/${putCode}`);
  const doi = (summary['external-ids']?.['external-id'] ?? []).find(
    (id) => id['external-id-type'] === 'doi',
  )?.['external-id-value'];

  snapshotWorks.push({
    putCode,
    title: summary.title?.title?.value ?? '',
    type: summary.type ?? null,
    year: summary['publication-date']?.year?.value ?? null,
    journal: summary['journal-title']?.value ?? null,
    doi: doi ?? null,
    url: summary.url?.value ?? null,
    authors: (detail.contributors?.contributor ?? [])
      .map((contributor) => contributor['credit-name']?.value)
      .filter((name): name is string => typeof name === 'string' && name.length > 0),
  });
}

// Leave the file alone when nothing has changed. A daily cron that rewrote the
// timestamp every morning would produce a commit and a site rebuild per day,
// and move the "last updated" date without anything having been updated.
const existing = await readFile(OUT, 'utf8')
  .then((text) => JSON.parse(text) as Snapshot)
  .catch(() => null);

if (existing && worksEqual(existing.works, snapshotWorks)) {
  console.log(`No change: ${snapshotWorks.length} works, unchanged since ${existing.fetchedAt}`);
  process.exit(0);
}

const snapshot = { orcid: ORCID, fetchedAt: new Date().toISOString(), works: snapshotWorks };
await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(
  existing
    ? `Updated: ${snapshotWorks.length} works (was ${existing.works.length})`
    : `Created: ${snapshotWorks.length} works`,
);
