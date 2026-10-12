/**
 * The size of a file under `public/`, for a page that wants to reserve its
 * space.
 *
 * Fails the build, naming the page and the file, when it is not there: an
 * entry that names an upload nobody committed would otherwise publish a broken
 * image and say nothing.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { imageSize, type ImageSize } from './image-size.ts';

/** An address that points off the site, which there is no file to measure for. */
const isRemote = (path: string): boolean => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path);

/**
 * `path` is a site-root path as the CMS writes it, such as `/uploads/fig.png`.
 * Returns null for an address on another site and for a format with no pixel
 * size; `owner` names whoever uses the file, for the error.
 */
export function uploadSize(path: string, owner: string): ImageSize | null {
  if (isRemote(path)) return null;
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(join(process.cwd(), 'public', path));
  } catch {
    throw new Error(`"${owner}" uses the image ${path}, which is not in public/`);
  }
  return imageSize(bytes);
}
