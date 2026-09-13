# The design

The site is set in one design, called **Record**. It was chosen from three
candidates; the other two and the switcher that compared them are gone, and
this is the record of what was picked and why.

## What it argues

The site is a record of the work, not an argument for it. One grotesque, a grid
you can see, and colour used only where it carries information.

**What it says about the lab.** That the science is the point and the reader's
time matters more than the lab's personality. It reads as an institution rather
than as a person.

**What it costs.** Warmth, and memorability. Nothing here is recognisably hers:
a visitor remembers the papers and not the page, and this is not a design
anyone shares for its own sake. It is also the safe answer, so it has to be
executed exactly right or it reads as a template. Every rule below is part of
executing it right.

**Where it comes from.** EMBL-EBI and Wellcome Sanger group pages;
Müller-Brockmann's grid systems, where rules and alignment do the work that
decoration does elsewhere.

---

## 1. Tokens — `src/lib/design.ts`

`DESIGN` is one face, a Utopia type scale, a space scale, a colour set and
seven shape values. `src/components/Tokens.astro` turns it into custom properties on
`:root`.

Nothing that belongs there belongs in a stylesheet. A literal `2px` or
`#f0f0f0` in `design.css` is a value that wants to be a token — that is what
happened to the rule weights, which lived as nineteen copies of `2px` and `3px`
before becoming `ruleStrong` and `ruleHeavy`.

| Token group | Emitted as | Notes |
| --- | --- | --- |
| `fonts` | `--font-display`, `--font-body`, `--font-mono` | One family, Archivo, doing both jobs; mono is the system stack, for `<code>` |
| `type` | `--step--1` … `--step-5` | Fluid, interpolating over 320–1240px. No `-2`: it resolves under 12px |
| `space` | `--space-3xs` … `--space-3xl` | Multiples of one fluid base step |
| `colors` | `--color-<name>` | Light only. Every grey is neutral, so the one hue always means something. Three draw lines, against different thresholds: `grid` is structure, `border` groups, `linkRule` identifies a control and so clears 3:1 |
| `shape` | `--radius`, `--rule`, `--rule-strong`, `--rule-heavy`, `--measure`, `--measure-wide`, `--page-max` | Three rule weights: divide a row, open a section, close a masthead. Two measures: one column of text, and the module's column with a drawn edge either side. `--page-max` is what the module comes to at the wider one, and the footer stops there too |

The accent is `#7b4b8a` — the favicon's colour, and the colour of the site she
had before this one, so a tab strip and a browser history still recognise her.
It is also reserved. In prose it marks the one word in a sentence that goes
somewhere; in a list where every entry is a link, colouring them all would say
nothing, so those take the heading colour with a grey underline and turn
lavender only under the cursor.

One list is the exception, and it is the identity block's ORCID, GitHub and
Scholar. Those three are the only links on the site that leave it, and they are
the record the site is a record of, so they keep the accent — and they are the
one place a mark is set beside the words. The marks are inline SVG in
`components/Icon.astro`, drawn in `currentColor` so each is its link's colour by
construction rather than by a second declaration that can drift from it. ORCID
publishes brand guidance asking for its iD in ORCID green; a single green mark
in an achromatic palette would read as a foreign object rather than as a brand,
so all three take the hue this site already has.

Where those three sit is decided by how much room they have, not by the
viewport: a row where the identity is a full-width masthead, one per line where
it is a column. The shape in between — two on one line and the third below —
is the one `pnpm check:responsive` rejects, because nothing on the page says
whether the break was meant.

## 2. Arrangement — `base.css` and `design.css`

`base.css` declares the layer order once, and the grid:

```css
@layer reset, base, layout, components, utilities;
```

`design.css` extends those same layers and is imported after it. The split is
by what a rule is about, not by which file got there first: `base.css` is the
reset, the shared components and the default single-column arrangement;
`design.css` is every choice this design made.

`.page` has three named areas — `nav`, `identity` and `main`. Navigation, the
identity block and `<main>` are emitted exactly once, in `BaseLayout`, and
placed by grid-area, so the layout changes where things sit
without changing the markup. They are emitted in the order a reader meets them
— nav, identity, main — because grid placement moves the picture and not the
document, and a keyboard or a screen reader gets the source order at every
width. Above 62rem the menu sits under the identity inside the left column, so
those two swap on screen; that is the one place the order is not literal, and
the site's navigation before the site's name is the right way round for a
reader who cannot see the column.

Three arrangements, not two:

```
Below 42rem              42rem to 62rem            62rem and up

┌───────────────┐        ┌──────────┬─────┐        ┌────────┬──────┬──────┐
│  BELMAN LAB   │        │ identity │ nav │        │identity│ main │ index│
│   main        │        ├──────────┴─────┤        ├────────┤      │      │
│    (h1,       │        │      main      │        │  nav   │      │      │
│     index,    │        │  (h1, index,   │        └────────┴──────┴──────┘
│     the page) │        │   the page)    │
├═══════════════┤        └────────────────┘        14rem / 1fr / 13rem
│  nav (a bar)  │        1fr / auto
└───────────────┘
```

Narrow, the page comes first and the menu goes to the foot of the screen. It is
drawn as a bar: it bleeds past the page's margin to both edges of the screen, a
heavy rule closes it off from the page above it, its three items divide the
width between them, and a hairline in the grid grey separates each compartment
from the next.

It was a bar across the top, and the top of a phone screen turned out to be the
wrong place for it. The menu, the identity, the profile links and the in-page
index made four blocks of chrome, and on `/research` at 375×812 the page's own
`<h1>` sat 361px down — 44% of the first screen, behind five horizontal rules,
three of them the same closing weight. It was also gone the moment a reader
scrolled: `/publications` is nearly five screens at 375px and the footer holds
no links, so the only way back to the menu was to scroll to the top. At the
foot it costs the page nothing, it is under a thumb rather than across the
screen from one, and it is there from anywhere. The `<h1>` is at 49px now and
the first sentence of the article is on the first screen.

What is left of the identity there is one line: the lab, in the accent, over
the page's own title. The name, the strapline and the profile links are on the
home page — the page they are about, one tap away — and the footer carries the
lab and her name on every page. The home page keeps all of it, because there
the identity is not chrome in front of the content; it is the content.

The items divide the bar with `flex: 1 1 auto` and centre their labels in what
they get, which puts every compartment boundary exactly halfway between two
words at every width, with no number to keep in step. `flex: 1` is the version
that looks the same and is not: it zeroes the basis, the items come out equal
in width, and the boundary lands on the geometric third — 7 to 11px off the
midpoint, and visibly so between the shortest label and the longest.

The tracking is the design's own 0.08em in the bar and in the module, and
tightens to 0.04em only in the band between them, where the menu is an `auto`
track and every pixel of tracking comes out of the identity column beside it.
That is the one place in this design a measurement gets smaller as the screen
gets bigger, and it is the column beside it that asks for it.

The middle one exists because the module needs 62rem and a second column needs
far less: a tablet held upright was drawing a full-width identity with half the
screen empty beside it and the page's own title most of a screen down. There
the identity keeps the fraction and the menu takes what it needs, so the rule
closing the strapline stops short of the menu — two rules of two lengths, which
is the module's argument arriving early. The menu comes back into the flow at
the top of the page here: there is room beside the identity, so none of the
reasons for fixing it to the foot of the screen apply, and a bar across the
foot of a tablet is a phone's answer to a question this width did not ask. The
home page opts out and keeps the stack, because there the identity is the row
rather than a label beside a menu.

Where that band starts is set by what the narrower column has to hold, not by a
round number: the menu takes its content's width and the identity gets the
rest, and the identity has to stay wide enough for the row of profile links at
its foot.

**A band only owns its widths if the cascade lets it.** A media query does not
change specificity, so a rule qualified with `:has()` inside the 42rem block
goes on beating the plain `.page` at 62rem for as long as the page is wide. The
exceptions inside that block are therefore wrapped in `:where()`, which
contributes nothing, and source order does the rest. Getting this wrong is
silent: `grid-template-areas` named three columns while `grid-template-columns`
sized one, the browser invented the other two at 0px, and the home page drew a
99px-wide `<main>` on a desktop with every test still green.

Two things stop it reading as the default serious-website answer:

- **The module stays put across every page.** The third column exists whether
  or not there is an index to put in it, and a page with no index leaves it
  empty rather than growing into it. The left edge of the text never shifts as
  you move around the site, and neither does the right one.

  It did grow, on the argument that an empty column is waste, and the home page
  is where that showed: `<main>` was two tracks wide, the prose inside it
  stopped at the measure, and the rule that opens `## Education` ran 270px past
  the last line of the paragraph above it — a rule measuring a column no text
  was in. A rule crosses the whole column here, so the column has to be the
  text column. It is the same argument `<main>` already answers to as the
  container the justification threshold is measured against: the element a
  container query measures has to go on being the thing it claims to measure.
- **The home page spends its whole first row on a strapline** instead of a
  hero, so the first thing read is who this is and what she does. It is the one
  page whose subject is the person, which is also why its name is the `<h1>` —
  `identityIsHeading` in `BaseLayout`, and `:has(h1.identity__name)` is what
  the stylesheet reads to find it.

The gutters are drawn rather than implied: the hairline sits in the middle of
the gutter, so each column is pulled half a gutter left and pads the same amount
back, and the text lands exactly where the grid puts it. Below 62rem there is
one column and so no gutter to draw: the motif is a desktop one, and the narrow
arrangement says the same thing with the bar across its foot and the rules that
open and close each block above it.

**The measure is wider inside the module.** 60 characters below it and 66
within, swapped on `.page` rather than on `:root` — `Tokens.astro` emits the
root block unlayered, and an unlayered declaration beats every layer whatever
it says, so the override is set on the element under it and inherited from
there. It is wider because both edges of the column are drawn: below the module
the eye comes back to the edge of the screen, and in the module it comes back
to a hairline with a menu behind it, which is a line the column can carry six
characters more of. `--page-max` is sized from it — 14rem and 13rem of columns,
two gutters and the page's own padding either side — so the text column
measures 66 characters exactly at the width the page stops growing.

**The in-page index is the one piece of page structure `BaseLayout` cannot
place.** It belongs between a page's title and the page, and both of those are
inside `<main>`, so a sibling of `<main>` can only be drawn above the whole
article or below it — which is how it came to sit above the `<h1>`, offering a
reader "01 Core research themes" before it told them they were on Research. The
pages render `<SectionIndex>` themselves now, directly after their own `<h1>`;
`test/reading-order.test.ts` holds that, because nothing in the stylesheet can
put it right if a page emits it somewhere else.

Above 62rem it is still the third column, and getting it there from inside
`<main>` is the one place this design positions rather than places. `<main>`
stays exactly one column wide and the index is taken out of its flow and
anchored against `.page`, in the same track the third column has always
occupied. The obvious alternative — widen `<main>` across both tracks and
divide it again — is wrong for a reason worth writing down: `<main>` is the
container the justification threshold is measured against, so growing it by a
column that is not text justified the module's prose at 992px, where the
column is 23 characters short of taking it. The element a container query
measures has to go on being the thing it claims to measure.

The column is one box and the index inside it is another, because a box that
stretches to its column has nowhere to travel and `position` takes one value:
the outer one is full height and carries the hairline, the inner one is what
follows the reader down the page.

## 3. Naming — one element, one fact

Most of what the design does is not new markup. It is an element named
precisely enough to be styled for what it is: `.pub__year` is a paper's year
lifted out of its citation, and it is railed down a 4rem margin. `.dateline` is
the date on a dated page, and it is a tracked label over a rule.
`.person__placeholder` says an entry is not a real person, and it is set in
tracked capitals.

Where it is new markup, it is because the fact has no element yet.
`.identity__address` is the three lines of where she works, wrapped, and that
is what lets both desktop arrangements centre them in the room under the
strapline's rule with an auto margin and no number: a block has a top and a
bottom to give away, where three sibling paragraphs have only the gaps between
them. The alternative is a padding that has to be kept in step with the height
of a row that is itself a measurement of something else.

The two arrangements get different amounts of that room, and that is the
arrangement rather than an oversight. The column sets the same address one line
narrower, so it stands 61px taller than the masthead before either has any
slack, and one row floor serves both: 29px to divide in the column against 68
in the masthead, which lands them at 14 and 34. A full-width row carries air a
14rem column would look empty holding. What both keep is the pinning — the
profile links, the rule under them and the menu under that are at the same
height on every page, because the address grows its box to fill the room rather
than the links being pushed down into it.

Emit the fact once, in real text, and style it. Reaching the same element
positionally instead — `p:first-of-type`, `p:last-of-type` — is how this goes
wrong, and it broke the moment a third paragraph appeared.

## Invariants

Anything here that a change would break is pinned by a test or a checker.

- **One `<nav aria-label="Primary">`, one identity block, one `<main>`, one
  `<h1>` per page** — `test/single-emission.test.ts` and
  `pnpm check:responsive`.
- **The in-page index is rendered by the page, directly after its `<h1>`** —
  `test/reading-order.test.ts`. The stylesheet cannot correct a page that puts
  it anywhere else, and above 62rem it is positioned on the assumption it is
  there.
- **The measure constrains prose, not the column.** `--measure` applies to
  paragraphs and headings, never to a grid container: applying it to the
  container squeezes the card lists.
- **Every page works at 320px first.** `pnpm check:responsive` drives a real
  browser over every page and viewport: standing controls ≥44px, body text
  ≥16px on mobile, nothing under 12px, no sideways scroll, the first heading on
  the page is the `<h1>`, and `.page` sizes every column its areas name.
- **Nothing hides under the fixed menu.** Below 42rem the bar is out of the
  flow, and `body` pads its own height — `--menu-bar`, built from the parts of
  the bar rather than from a number — back at the foot of the page.
- **Light only.** There is no dark palette and no `light-dark()` outside
  `src/admin/`, which is a tool surface rather than part of this design.
- **No parallel stylesheet, no colour literals, no hardcoded type or space.**
