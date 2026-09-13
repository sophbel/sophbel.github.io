import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { collections, fileCollections } from '../src/schema/collections.ts';
import { BODY_FIELD, type Field } from '../src/schema/fields.ts';

/**
 * Every field the CMS offers must be rendered somewhere.
 *
 * A field with nowhere to go is worse than a missing feature: the editor fills
 * it in, saves, and the content silently never appears. Five had accumulated
 * before this test existed - a news image, a project image, a project body, a
 * highlight body, and the lab name.
 *
 * The match is by name rather than by data flow, so it catches a field nothing
 * references at all. It cannot tell that `data.image` is read for projects but
 * not for news; that limit is the price of a check that needs no build step.
 */
const SRC = new URL('../src/', import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return path.endsWith('/schema') ? [] : sourceFiles(path);
    return /\.(astro|ts)$/.test(entry) ? [path] : [];
  });
}

const source = sourceFiles(SRC)
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const names = (fields: Field[]): string[] => fields.map((field) => field.name);

describe('every CMS field is rendered somewhere', () => {
  for (const collection of collections) {
    it(`${collection.name}`, () => {
      const unrendered = names(collection.fields).filter((name) =>
        name === BODY_FIELD ? !source.includes('render(') : !source.includes(`data.${name}`),
      );
      expect(unrendered).toEqual([]);
    });
  }

  for (const file of fileCollections.flatMap((collection) => collection.files)) {
    it(`${file.name}`, () => {
      const unrendered = names(file.fields).filter((name) => !source.includes(`site.${name}`));
      expect(unrendered).toEqual([]);
    });
  }
});
