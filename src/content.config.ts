import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { collections as specs } from './schema/collections.ts';
import { toZod } from './schema/generate.ts';

/**
 * Astro collections derived from the shared content spec, so a field can never
 * exist in the CMS form without also existing in the schema that validates it.
 */
export const collections = Object.fromEntries(
  specs.map((spec) => [
    spec.name,
    defineCollection({
      loader: glob({ pattern: '**/*.md', base: `./${spec.folder}` }),
      schema: toZod(spec.fields),
    }),
  ]),
);
