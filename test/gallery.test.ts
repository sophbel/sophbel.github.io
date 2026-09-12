import { describe, it, expect } from 'vitest';
import { galleryState, type GalleryPhoto } from '../src/lib/gallery.ts';

const photo = (over: Partial<GalleryPhoto> = {}): GalleryPhoto => ({
  id: 'a',
  name: 'a.jpg',
  caption: 'A',
  description: '',
  width: 1600,
  height: 1200,
  ratio: 4 / 3,
  ...over,
});

describe('galleryState', () => {
  it('reports emptiness as an explicit state, not a blank grid', () => {
    const state = galleryState([]);
    expect(state.kind).toBe('empty');
  });

  it('names the unshared-folder cause, because Drive returns 200 for both', () => {
    const state = galleryState([]);
    expect(state.kind === 'empty' && state.warning).toMatch(/shared/i);
  });

  it('passes photos through unchanged when there are any', () => {
    const photos = [photo({ id: 'a' }), photo({ id: 'b' })];
    const state = galleryState(photos);
    expect(state).toEqual({ kind: 'photos', photos });
  });
});
