# AGENTS.md

The live website of the Belman Lab, at <https://sophbel.github.io>. One
content model, one design, her real content. `README.md` describes how the
pieces fit together; the design and the content model were worked out in
`inkpot-monkey/belman-lab-demo`, which is archived.

## Working here

- **Run commands through `nix develop -c <command>`.** The devShell pins pnpm,
  Node and the chromium that `pnpm check:responsive` and `pnpm gen:og` drive.
- **Commit straight onto `main`, one self-contained change per commit.** This
  overrides the usual branch-first default. Every push touching `src/**`
  deploys, which is the point: each step goes live as it lands. It also means
  a half-finished commit is a half-finished live site.
- **Verify with `pnpm build`, `pnpm test` and `pnpm typecheck`**, plus
  `pnpm check:responsive`, which needs `pnpm preview` already running.

## Facts you cannot read off the code

- **The site is light-only and has no dark palette.** `src/admin/` is the
  exception: the CMS shell is a tool surface and keeps its own `light-dark()`
  pairs.
- **Seven of the site's sections are shelved, not deleted.** Team, Software &
  data, Projects, News, Events, Gallery and Join us are nothing but stand-in
  content so far, so they are built no longer and linked from nowhere. Their
  pages sit in `src/pages/` under a leading underscore and still typecheck;
  `src/lib/nav.ts` holds the menu entries behind a `shelved` flag and the
  `SHELVED_PAGES` list. Keep them compiling when you change anything shared.
- **`src/schema/collections.ts` is the single source for the content model.**
  It generates both the Zod schema and `public/admin/config.yml`; commit the
  regenerated config alongside any change to it.
- **Publications come from `src/data/orcid-snapshot.json`**, a committed
  snapshot. Only `pnpm sync:orcid` talks to ORCID, so builds are reproducible
  and work offline.
- **The link-preview card is generated, not drawn.** `public/og.jpg` is a
  committed artefact of `pnpm gen:og`, which screenshots the site's own
  masthead. Regenerate it when `src/data/site.json`, the portrait or the
  identity design changes, and commit the result.
- **Stand-in content stays visibly fake, and off the site.** Stand-in people
  are named "PhD Student Name" and carry a `placeholder` flag the team page
  renders as a label; the whole section is shelved until they are real. What
  the site publishes is real: her ORCID record, her GitHub account, her own
  words.
- **The site is indexable, and that is a default rather than a setting.** See
  `src/lib/env.ts` for which way round the switch goes and why. Pages that
  should never be indexed - the manual and the 404 - say so for themselves.

## The design

`docs/design.md` is Record in prose: what it argues, what it costs, the five
token groups, the two-file cascade, the grid it arranges and the invariants
that are pinned by tests. Read it before any styling work — particularly the
token rule, since a literal colour or pixel weight in `design.css` is the most
common way this design goes wrong.
