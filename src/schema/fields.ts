/**
 * One declarative description of the content model.
 *
 * Two things must agree about the shape of a Person or a Publication: Astro's
 * Zod schema, which fails the build on a bad entry, and Sveltia's config.yml,
 * which decides what the editing form offers. Describing the fields once and
 * deriving both removes the possibility of drift — the CMS cannot offer a field
 * the build will reject.
 */

interface FieldBase {
  /** Frontmatter key. */
  name: string;
  /** Label shown in the CMS form. */
  label: string;
  /** Defaults to true; false makes the field optional in both derivations. */
  required?: boolean;
  /** Help text shown under the field in the CMS. */
  hint?: string;
}

/** Widgets that map to a single scalar value. */
export type ScalarWidget = 'string' | 'text' | 'markdown' | 'image' | 'datetime' | 'number' | 'boolean';

export type Field =
  | (FieldBase & { widget: ScalarWidget })
  | (FieldBase & { widget: 'select'; options: string[] })
  | (FieldBase & { widget: 'list'; field: Field })
  | (FieldBase & { widget: 'object'; fields: Field[] });

export interface CollectionSpec {
  name: string;
  label: string;
  labelSingular: string;
  /** Repo-relative folder holding the entries. */
  folder: string;
  /**
   * Marks a collection that exists to demonstrate the layout rather than to
   * hold real content. Rendered with a visible banner.
   */
  demo?: boolean;
  fields: Field[];
}

export interface FileEntrySpec {
  name: string;
  label: string;
  /** Repo-relative path of the single file this entry edits. */
  file: string;
  fields: Field[];
}

/**
 * A collection of individually-named files rather than a folder of entries.
 * Used for things there is exactly one of - site details, footer - where
 * letting an editor create a second entry would be a footgun.
 */
export interface FileCollectionSpec {
  name: string;
  label: string;
  files: FileEntrySpec[];
}

/**
 * The frontmatter key whose value is the Markdown body rather than a
 * frontmatter entry. Astro exposes it outside `data`, so it is deliberately
 * absent from the Zod schema and present in the CMS form.
 */
export const BODY_FIELD = 'body';
