/**
 * Derive both consumers of the content model from the spec in `fields.ts`.
 *
 * Astro needs a Zod schema and Sveltia needs a YAML config. Deriving each from
 * one declaration is what makes the guarantee hold: the CMS cannot offer a
 * field the build would reject, because neither side is written by hand.
 *
 * The spec, not Zod, is the single source. Reading widget shapes back out of a
 * Zod schema would mean depending on its internals, which change between major
 * versions.
 */
import { z } from 'zod';
import { stringify } from 'yaml';
import {
  BODY_FIELD,
  type CollectionSpec,
  type Field,
  type FileCollectionSpec,
} from './fields.ts';

/** Zod type for one field, before optionality is applied. */
function zodForField(field: Field): z.ZodType {
  switch (field.widget) {
    case 'string':
    case 'text':
    case 'markdown':
    case 'image':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'datetime':
      return z.coerce.date();
    case 'select':
      return z.enum(field.options as [string, ...string[]]);
    case 'list':
      return z.array(zodForField(field.field));
    case 'object':
      return toZod(field.fields);
  }
}

/**
 * Build the Astro content schema. The Markdown body is skipped: Astro surfaces
 * it as rendered content, not as frontmatter, so requiring it here would fail
 * every entry.
 */
export function toZod(fields: Field[]): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    if (field.name === BODY_FIELD) continue;
    const base = zodForField(field);
    shape[field.name] = field.required === false ? base.optional() : base;
  }
  return z.object(shape);
}

/** One field as Sveltia's config.yml expects it. */
export interface SveltiaField {
  name: string;
  label: string;
  widget: string;
  /** Only ever emitted as `false`; Sveltia treats an absent key as required. */
  required?: false;
  hint?: string;
  options?: string[];
  field?: SveltiaField;
  fields?: SveltiaField[];
}

/** Build the Sveltia field list. Sveltia treats fields as required by default. */
export function toSveltiaFields(fields: Field[]): SveltiaField[] {
  return fields.map((field) => {
    const emitted: SveltiaField = {
      name: field.name,
      label: field.label,
      widget: field.widget,
    };
    if (field.required === false) emitted.required = false;
    if (field.hint !== undefined) emitted.hint = field.hint;
    if (field.widget === 'select') emitted.options = field.options;
    if (field.widget === 'list') emitted.field = toSveltiaFields([field.field])[0]!;
    if (field.widget === 'object') emitted.fields = toSveltiaFields(field.fields);
    return emitted;
  });
}

export function toSveltiaCollection(spec: CollectionSpec): Record<string, unknown> {
  return {
    name: spec.name,
    label: spec.label,
    label_singular: spec.labelSingular,
    folder: spec.folder,
    create: true,
    extension: 'md',
    format: 'frontmatter',
    slug: '{{slug}}',
    fields: toSveltiaFields(spec.fields),
  };
}

export function toSveltiaFileCollection(spec: FileCollectionSpec): Record<string, unknown> {
  return {
    name: spec.name,
    label: spec.label,
    files: spec.files.map((entry) => ({
      name: entry.name,
      label: entry.label,
      file: entry.file,
      fields: toSveltiaFields(entry.fields),
    })),
  };
}

export interface CmsConfigInput {
  /** `owner/name` of the repository Sveltia commits to. */
  repo: string;
  branch: string;
  mediaFolder: string;
  publicFolder: string;
  collections: CollectionSpec[];
  fileCollections?: FileCollectionSpec[];
}

const HEADER = `# GENERATED FILE - DO NOT EDIT.
# Written by scripts/generate-cms-config.ts from src/schema/collections.ts.
# Edit the collection spec there and run \`pnpm gen:cms\`.
`;

export function generateCmsConfig({
  repo,
  branch,
  mediaFolder,
  publicFolder,
  collections,
  fileCollections = [],
}: CmsConfigInput): string {
  const config = {
    backend: {
      name: 'github',
      repo,
      branch,
      // No OAuth relay exists to sign in against, so offer only the personal
      // access token flow rather than a button that cannot work.
      auth_methods: ['token'],
      // Explicitly false, which is not the same as absent: absent hides the
      // publish UI entirely, false shows it and defaults each save to
      // publishing immediately.
      skip_ci: false,
    },
    media_folder: mediaFolder,
    public_folder: publicFolder,
    collections: [
      ...collections.map(toSveltiaCollection),
      ...fileCollections.map(toSveltiaFileCollection),
    ],
  };

  return HEADER + stringify(config, { lineWidth: 0 });
}
