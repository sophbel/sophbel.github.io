# Belman Lab

The website of the Belman Lab at the Yale School of Public Health, live at
<https://sophbel.github.io>.

One content model, one design, real content. It is a folder of static files
with nothing running behind it: no server, no database, no subscription.

The design and the content model were worked out in
[inkpot-monkey/belman-lab-demo](https://github.com/inkpot-monkey/belman-lab-demo),
which is archived. `docs/design.md` carries the reasoning forward.

## Running it

```sh
direnv allow      # or: nix develop
pnpm install
pnpm dev
```

Then open <http://localhost:4321>.

| Command | Does |
| --- | --- |
| `pnpm dev` | Regenerate the CMS config, vendor Sveltia, start the dev server |
| `pnpm build` | Same, then build to `dist/` |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm gen:og` | Redraw the link-preview card |
| `pnpm check:responsive` | Drive a real browser over every page and viewport (needs `pnpm preview` running) |

## How it fits together

**One content spec, two derivations.** `src/schema/collections.ts` describes
every collection once. `src/content.config.ts` turns it into Zod schemas that
fail the build on a bad entry, and `scripts/generate-cms-config.ts` turns it
into `public/admin/config.yml`, which decides what the CMS form offers. The CMS
cannot offer a field the build would reject.

**One design, in two files.** `src/lib/design.ts` holds its tokens — one face,
a Utopia type and space scale, a colour set, seven shape values — and
`src/components/Tokens.astro` emits them as custom properties on `:root`.
`src/styles/base.css` is the reset, the shared components and the default
single-column arrangement; `src/styles/design.css` extends the same cascade
layers with everything that is a choice the design made. No literal colours or
pixel weights live in the stylesheet: a value in there is a token that has not
been named yet.

Navigation, the identity block and `<main>` are each emitted exactly once, in
`BaseLayout`, and placed by grid-area. `test/single-emission.test.ts` pins
that, because a second copy of one of them would put two "Primary" landmarks
and every link twice into every page.

`docs/design.md` is the fuller version: what the design argues, what it costs,
and the invariants that hold.

**Most of the site is shelved.** Team, Software & data, Projects, Events and
Gallery are still stand-in content, so nothing links to them and
nothing builds them. Their pages keep their code under a leading underscore in
`src/pages/`, which is Astro's "compile this, do not route it", and
`src/lib/nav.ts` keeps their menu entries behind a `shelved` flag. Bringing one
back is dropping the underscore and dropping the flag.

**Publications are a list kept by hand.** One file, `src/data/publications.json`,
with a row per paper, each holding a pasted BibTeX entry, edited through the
CMS. The page prints two lists from it: every row under "All publications", and
the ones marked `selected` above, where a picture can go with them. `src/lib/bibtex.ts` reads
the entries, `src/lib/publication-data.ts` validates the file at build time and
`src/lib/publications.ts` holds the ordering and selection rules; nothing
reaches out to another service.

**Events and gallery are fixtures.** `src/data/fixtures/` holds data shaped
exactly like `@palebluebytes/cms` returns, so wiring the real Google Calendar
and Drive folder later is a one-line swap for `fetchEvents()` / `fetchPhotos()`.

## What is published and what is waiting

Everything the site publishes is real. Everything that is not is shelved.

| On the site | Shelved |
| --- | --- |
| Home and Research prose | Everyone on the team except Sophie |
| Publications (her own list), Join, News | Projects |
| Site details, footer, links | Events, Gallery, Software & data |

The publications list started as a copy of her ORCID record and is hers to add
to from here; papers ORCID never had can simply be entered.

## Deployment

GitHub Actions builds and deploys to GitHub Pages on every push touching the
site. There is no server and no platform-specific code — `dist/` is plain
static files. See `.github/workflows/`.

## Editing

See [docs/cms-access.md](docs/cms-access.md), and `/how-this-works` on the site
itself.
