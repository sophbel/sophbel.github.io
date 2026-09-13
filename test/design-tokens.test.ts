import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * `design.css` holds arrangement, not values.
 *
 * This is the invariant `docs/design.md` closes on and the one AGENTS.md
 * singles out, because it is the most common way this design goes wrong: a
 * literal in the stylesheet is a decision nobody can find to change. The rule
 * weights are the worked example - nineteen copies of `2px` and `3px` before
 * they became `ruleStrong` and `ruleHeavy` - and six copies of `1px` survived
 * that sweep, drawing the gutter hairline, the row dividers and the card edges
 * next to the `var(--rule)` that means the same thing.
 *
 * Only `design.css` is checked. `base.css` is the reset and the shared
 * components, where a hairline in `.visually-hidden` is a mechanism rather
 * than a design decision; the token rule is about the file that holds the
 * choices.
 */
const CSS = new URL('../src/styles/design.css', import.meta.url).pathname;
const source = readFileSync(CSS, 'utf8');

/** Declarations only: comments explain the rules and quote the values. */
const declarations = source.replace(/\/\*[\s\S]*?\*\//g, '');

describe('design.css names no value it could have asked for', () => {
  it('has no colour literal', () => {
    expect(declarations.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
    expect(declarations.match(/\b(?:rgba?|hsla?|oklch|color-mix)\(/gi) ?? []).toEqual([]);
  });

  it('has no pixel literal', () => {
    /*
      Every length this file sets is a rule weight, a type step or a space
      step, and all three are tokens. Widths and breakpoints are in `rem`,
      which is what makes them survive a reader who has changed their text
      size — so a `px` here is always the wrong unit as well as the wrong
      place to keep the number.
    */
    expect(declarations.match(/\b\d*\.?\d+px\b/g) ?? []).toEqual([]);
  });

  it('names no font family, so the one face stays declared once', () => {
    expect(declarations).not.toMatch(/font-family:\s*(?!var\()/);
  });
});

describe('design.css keeps the light-only invariant', () => {
  it('declares no dark palette', () => {
    expect(declarations).not.toMatch(/light-dark\(|prefers-color-scheme/);
  });
});

describe('the stylesheets stay mobile-first', () => {
  const files = ['../src/styles/design.css', '../src/styles/base.css'];

  it.each(files)('%s has no max-width query', (file) => {
    const text = readFileSync(new URL(file, import.meta.url).pathname, 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    expect(text).not.toMatch(/@(?:media|container)[^{]*max-(?:width|inline-size)/);
  });
});
