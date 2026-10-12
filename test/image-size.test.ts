import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { imageSize } from '../src/lib/image-size.ts';

const bytes = (...values: number[]) => Uint8Array.from(values);
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const text = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe('imageSize', () => {
  it('reads a PNG', () => {
    const png = bytes(0x89, ...text('PNG'), 13, 10, 26, 10, ...be32(13), ...text('IHDR'), ...be32(2462), ...be32(1012), 8, 6);
    expect(imageSize(png)).toEqual({ width: 2462, height: 1012 });
  });

  it('reads a GIF', () => {
    expect(imageSize(bytes(...text('GIF89a'), ...le16(320), ...le16(200), 0, 0))).toEqual({ width: 320, height: 200 });
  });

  it('reads a JPEG, skipping the segments before the frame header', () => {
    const jpeg = bytes(
      0xff, 0xd8,
      0xff, 0xe0, ...be16(16), ...text('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, // APP0, 16 bytes of payload
      0xff, 0xc4, ...be16(4), 0, 0, // a Huffman table, which is not a frame
      0xff, 0xc0, ...be16(11), 8, ...be16(851), ...be16(1280), 3, 1, 0x22, 0,
    );
    expect(imageSize(jpeg)).toEqual({ width: 1280, height: 851 });
  });

  it('reads a lossy WebP', () => {
    const webp = new Uint8Array(40);
    webp.set([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP'), ...text('VP8 ')]);
    webp.set([...le16(640), ...le16(480)], 26);
    expect(imageSize(webp)).toEqual({ width: 640, height: 480 });
  });

  it('reads a lossless WebP', () => {
    const webp = new Uint8Array(40);
    webp.set([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP'), ...text('VP8L')]);
    const bits = (640 - 1) | ((480 - 1) << 14);
    webp.set([bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255], 21);
    expect(imageSize(webp)).toEqual({ width: 640, height: 480 });
  });

  it('reads an extended WebP', () => {
    const webp = new Uint8Array(40);
    webp.set([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP'), ...text('VP8X')]);
    webp.set([...le24(1999), ...le24(799)], 24);
    expect(imageSize(webp)).toEqual({ width: 2000, height: 800 });
  });

  it('reads a real file the site already serves', () => {
    const profile = readFileSync(new URL('../public/uploads/profile.jpg', import.meta.url));
    const size = imageSize(profile);
    expect(size).not.toBeNull();
    expect(size!.width).toBeGreaterThan(0);
    expect(size!.height).toBeGreaterThan(0);
  });

  it('gives null for what it does not read, and for truncated or empty input', () => {
    expect(imageSize(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'))).toBeNull();
    expect(imageSize(bytes())).toBeNull();
    expect(imageSize(bytes(0x89, ...text('PNG')))).toBeNull();
    expect(imageSize(bytes(0xff, 0xd8, 0xff))).toBeNull();
  });
});
