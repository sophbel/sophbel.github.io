import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { toZod, toSveltiaFields, toSveltiaCollection, generateCmsConfig } from '../src/schema/generate.ts';
import type { CollectionSpec } from '../src/schema/fields.ts';

describe('toZod', () => {
  it('maps primitive widgets and enforces them', () => {
    const schema = toZod([
      { name: 'title', label: 'Title', widget: 'string' },
      { name: 'order', label: 'Order', widget: 'number' },
      { name: 'draft', label: 'Draft', widget: 'boolean' },
    ]);
    expect(schema.safeParse({ title: 'A', order: 1, draft: false }).success).toBe(true);
    expect(schema.safeParse({ title: 'A', order: 'nope', draft: false }).success).toBe(false);
  });

  it('rejects a missing required field', () => {
    expect(toZod([{ name: 'title', label: 'Title', widget: 'string' }]).safeParse({}).success).toBe(false);
  });

  it('allows a missing optional field', () => {
    expect(
      toZod([{ name: 'note', label: 'Note', widget: 'text', required: false }]).safeParse({}).success,
    ).toBe(true);
  });

  it('turns a select into an enum', () => {
    const schema = toZod([{ name: 'rank', label: 'Rank', widget: 'select', options: ['pi', 'postdoc'] }]);
    expect(schema.safeParse({ rank: 'pi' }).success).toBe(true);
    expect(schema.safeParse({ rank: 'dean' }).success).toBe(false);
  });

  it('coerces a datetime to a Date', () => {
    const parsed = toZod([{ name: 'date', label: 'Date', widget: 'datetime' }]).parse({ date: '2026-01-02' });
    expect((parsed as { date: Date }).date).toBeInstanceOf(Date);
  });

  it('maps a list to an array of its inner field', () => {
    const schema = toZod([
      { name: 'tags', label: 'Tags', widget: 'list', field: { name: 'tag', label: 'Tag', widget: 'string' } },
    ]);
    expect(schema.safeParse({ tags: ['a', 'b'] }).success).toBe(true);
    expect(schema.safeParse({ tags: [1] }).success).toBe(false);
  });

  it('nests an object', () => {
    const schema = toZod([
      {
        name: 'links',
        label: 'Links',
        widget: 'object',
        fields: [{ name: 'orcid', label: 'ORCID', widget: 'string', required: false }],
      },
    ]);
    expect(schema.safeParse({ links: {} }).success).toBe(true);
    expect(schema.safeParse({ links: { orcid: 1 } }).success).toBe(false);
  });

  it('excludes the markdown body, which Astro exposes outside the frontmatter', () => {
    const schema = toZod([
      { name: 'title', label: 'Title', widget: 'string' },
      { name: 'body', label: 'Body', widget: 'markdown' },
    ]);
    expect(schema.safeParse({ title: 'A' }).success).toBe(true);
    expect(Object.keys(schema.shape)).toEqual(['title']);
  });
});

describe('toSveltiaFields', () => {
  it('omits required for a required field and states it for an optional one', () => {
    expect(
      toSveltiaFields([
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'note', label: 'Note', widget: 'text', required: false },
      ]),
    ).toEqual([
      { name: 'title', label: 'Title', widget: 'string' },
      { name: 'note', label: 'Note', widget: 'text', required: false },
    ]);
  });

  it('keeps the body field, which is where the prose goes', () => {
    expect(toSveltiaFields([{ name: 'body', label: 'Body', widget: 'markdown' }])).toEqual([
      { name: 'body', label: 'Body', widget: 'markdown' },
    ]);
  });

  it('passes a hint through so the editor sees guidance in the form', () => {
    const [only] = toSveltiaFields([
      { name: 'title', label: 'Title', widget: 'string', hint: 'Shown in the browser tab' },
    ]);
    expect(only?.hint).toBe('Shown in the browser tab');
  });

  it('emits select options and nested list/object shapes', () => {
    const [select, list, object] = toSveltiaFields([
      { name: 'rank', label: 'Rank', widget: 'select', options: ['pi', 'postdoc'] },
      { name: 'tags', label: 'Tags', widget: 'list', field: { name: 'tag', label: 'Tag', widget: 'string' } },
      { name: 'links', label: 'Links', widget: 'object', fields: [{ name: 'orcid', label: 'ORCID', widget: 'string' }] },
    ]);
    expect(select?.options).toEqual(['pi', 'postdoc']);
    expect(list?.field).toEqual({ name: 'tag', label: 'Tag', widget: 'string' });
    expect(object?.fields).toEqual([{ name: 'orcid', label: 'ORCID', widget: 'string' }]);
  });
});

describe('toSveltiaCollection', () => {
  const spec: CollectionSpec = {
    name: 'people',
    label: 'People',
    labelSingular: 'Person',
    folder: 'src/content/people',
    fields: [{ name: 'name', label: 'Name', widget: 'string' }],
  };

  it('describes a folder collection Sveltia can create entries in', () => {
    expect(toSveltiaCollection(spec)).toMatchObject({
      name: 'people',
      label: 'People',
      label_singular: 'Person',
      folder: 'src/content/people',
      create: true,
      extension: 'md',
      format: 'frontmatter',
    });
  });
});

describe('generateCmsConfig', () => {
  const yaml = generateCmsConfig({
    repo: 'owner/repo',
    branch: 'main',
    mediaFolder: 'public/uploads',
    publicFolder: '/uploads',
    collections: [
      {
        name: 'people',
        label: 'People',
        labelSingular: 'Person',
        folder: 'src/content/people',
        fields: [{ name: 'name', label: 'Name', widget: 'string' }],
      },
    ],
  });
  const config = parseYaml(yaml);

  it('pins the backend to GitHub with token auth so no OAuth relay is needed', () => {
    expect(config.backend).toMatchObject({
      name: 'github',
      repo: 'owner/repo',
      branch: 'main',
      auth_methods: ['token'],
    });
  });

  it('sets skip_ci to false explicitly, which enables the publish UI while defaulting to publish', () => {
    // Omitting the key hides the Publish Changes button entirely; `false` is
    // not the same as absent here.
    expect(config.backend.skip_ci).toBe(false);
    expect('skip_ci' in config.backend).toBe(true);
  });

  it('carries the media folders through', () => {
    expect(config.media_folder).toBe('public/uploads');
    expect(config.public_folder).toBe('/uploads');
  });

  it('emits every collection', () => {
    expect(config.collections.map((c: { name: string }) => c.name)).toEqual(['people']);
  });

  it('warns that the file is generated', () => {
    expect(yaml.startsWith('#')).toBe(true);
    expect(yaml).toMatch(/generated/i);
  });
});

describe('file collections', () => {
  const config = parseYaml(
    generateCmsConfig({
      repo: 'owner/repo',
      branch: 'main',
      mediaFolder: 'public/uploads',
      publicFolder: '/uploads',
      collections: [],
      fileCollections: [
        {
          name: 'settings',
          label: 'Site details',
          files: [
            {
              name: 'site',
              label: 'Profile and footer',
              file: 'src/data/site.json',
              fields: [{ name: 'name', label: 'Name', widget: 'string' }],
            },
          ],
        },
      ],
    }),
  );

  it('emits a files collection that cannot have entries added to it', () => {
    const settings = config.collections.find((c: { name: string }) => c.name === 'settings');
    expect(settings.files).toHaveLength(1);
    expect(settings.files[0]).toMatchObject({
      name: 'site',
      label: 'Profile and footer',
      file: 'src/data/site.json',
    });
    expect(settings.create).toBeUndefined();
    expect(settings.folder).toBeUndefined();
  });
});
