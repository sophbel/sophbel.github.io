/**
 * Read an image's pixel size from its first bytes.
 *
 * An upload carries no dimensions, and a page that does not know them cannot
 * reserve the space, so the image shoves everything below it down when it
 * arrives. Reading the header at build time fixes that without a dependency or
 * a second copy of the file. Returns null for a format it does not read (an
 * SVG has no pixel size to give), and the page then simply leaves the size off.
 */
export interface ImageSize {
  width: number;
  height: number;
}

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length));

export function imageSize(bytes: Uint8Array): ImageSize | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const has = (length: number) => bytes.length >= length;

  // PNG: an 8-byte signature, then the IHDR chunk with the size in it.
  if (has(24) && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  // GIF: a 6-byte header, then the logical screen size, little-endian.
  if (has(10) && ascii(bytes, 0, 3) === 'GIF') {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }

  // JPEG: walk the segments until a start-of-frame marker, which holds the size.
  if (has(4) && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1]!;
      // Fill bytes, and markers that stand alone with no length.
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        i += 2;
        continue;
      }
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      i += 2 + view.getUint16(i + 2);
    }
    return null;
  }

  // WebP: a RIFF container whose first chunk says which of three encodings.
  if (has(30) && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    const chunk = ascii(bytes, 12, 4);
    if (chunk === 'VP8 ') {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      const le24 = (at: number) => bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
      return { width: le24(24) + 1, height: le24(27) + 1 };
    }
  }

  return null;
}
