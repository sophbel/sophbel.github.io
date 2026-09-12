# Belman Lab site — design demo

A research group site: one content model, one design, real content.

This is a **demo repository**. It existed to choose a design between three
candidates; Record won, and the other two have been removed. The site moves
into `sophbel/sophbel.github.io`; this repo then gets archived.

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
| `pnpm sync:orcid` | Re-fetch the ORCID snapshot |
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

**Most of the site is shelved.** Team, Software & data, Projects, News, Events,
Gallery and Join us are still placeholder content, so nothing links to them and
nothing builds them. Their pages keep their code under a leading underscore in
`src/pages/`, which is Astro's "compile this, do not route it", and
`src/lib/nav.ts` keeps their menu entries behind a `shelved` flag. Bringing one
back is dropping the underscore and dropping the flag.

**Publications come from ORCID.** `pnpm sync:orcid` writes
`src/data/orcid-snapshot.json`; the build reads only that file, so builds are
reproducible and work offline. `src/lib/orcid.ts` handles presentation —
repairing titles that Crossref mangled, and linking preprints to their published
versions.

**Events and gallery are fixtures.** `src/data/fixtures/` holds data shaped
exactly like `@palebluebytes/cms` returns, so wiring the real Google Calendar
and Drive folder later is a one-line swap for `fetchEvents()` / `fetchPhotos()`.

## What is real and what is not

Everything the site publishes is real. Everything that is not is shelved.

| On the site | Shelved |
| --- | --- |
| Home and Research prose | Everyone on the team except Sophie |
| Publications (live ORCID record) | News, Projects, Join us |
| Site details, footer, links | Events, Gallery, Software & data |

The publications page deliberately shows the ORCID record **as it currently
stands**, which is missing at least six papers including a Lancet Microbe
article. That gap is visible on purpose.

## Deployment

GitHub Actions builds and deploys to GitHub Pages. There is no server, no
Cloudflare Worker, and no platform-specific code — `dist/` is plain static
files. See `.github/workflows/deploy.yml`.

## Editing

See [docs/cms-access.md](docs/cms-access.md).
