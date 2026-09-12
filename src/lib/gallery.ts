/**
 * Deciding what a gallery should show.
 *
 * Split from the page because of a documented failure mode in the Drive
 * loader: a folder that stops being shared answers `200 {"files": []}`, which
 * is indistinguishable from an empty folder. Rendering that as a blank grid
 * hides a broken integration, so emptiness is an explicit state the page must
 * handle rather than a length check buried in a template.
 */

export interface GalleryPhoto {
  id: string;
  name: string;
  caption: string;
  description: string;
  width: number | null;
  height: number | null;
  ratio: number;
  url?: string;
}

export type GalleryState =
  | { kind: 'empty'; warning: string }
  | { kind: 'photos'; photos: GalleryPhoto[] };

const EMPTY_WARNING =
  'No photos were returned. If this is unexpected, check the Drive folder is still shared — ' +
  'an unshared folder returns an empty list rather than an error.';

export function galleryState(photos: GalleryPhoto[]): GalleryState {
  if (photos.length === 0) return { kind: 'empty', warning: EMPTY_WARNING };
  return { kind: 'photos', photos };
}
