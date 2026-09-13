import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { OG_CARD } from '../src/lib/og.ts';

/**
 * The link-preview card is a committed artefact, drawn by a script nobody runs
 * on a schedule, and its failure mode is invisible from inside the repository:
 * the site builds, the page is fine, and the only thing that is wrong is what
 * a stranger sees in a Slack channel a week later.
 *
 * Two things can go wrong quietly. The card can be missing from a build, and
 * the size declared in `og:image:width` and `og:image:height` can stop
 * matching the file - which makes a preview reflow or crop, because the
 * platforms lay out from the declaration before the image arrives. Both are
 * cheap to pin.
 *
 * What this cannot check is whether the card still *says* the right thing.
 * Change `src/data/site.json` or the portrait and the card goes stale without
 * changing size; regenerate it with `pnpm gen:og`.
 */
const card = readFileSync(new URL(`../public${OG_CARD.path}`, import.meta.url));

/**
 * JPEG dimensions live in the frame header, which is any of the SOFn markers.
 * Walk the segment chain rather than scanning for a byte pattern: the entropy
 * -coded data after a marker is arbitrary bytes and will happily contain one.
 */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.readUInt16BE(0) !== 0xffd8) throw new Error('not a JPEG: no start-of-image marker');

  let offset = 2;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) throw new Error(`expected a marker at byte ${offset}`);
    const marker = bytes[offset + 1]!;

    // SOF0/1/2 and the rest of the frame headers, excluding DHT (c4), JPGn
    // (c8) and DAC (cc), which share the range without describing a frame.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  throw new Error('no frame header found');
}

describe('the link-preview card', () => {
  it('is committed, so a build does not have to draw one', () => {
    expect(card.byteLength).toBeGreaterThan(0);
  });

  it('is the size the pages tell the platforms it is', () => {
    expect(jpegSize(card)).toEqual({ width: OG_CARD.width, height: OG_CARD.height });
  });

  it('is close enough to 1.91:1 for summary_large_image not to crop it', () => {
    expect(OG_CARD.width / OG_CARD.height).toBeCloseTo(1.91, 1);
  });

  it('stays under the 5MB the strictest consumer accepts', () => {
    expect(card.byteLength).toBeLessThan(5 * 1024 * 1024);
  });
});
