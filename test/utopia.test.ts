import { describe, it, expect } from 'vitest';
import { fluid, typeScale, spaceScale, tokensToCss } from '../src/lib/utopia.ts';

describe('fluid', () => {
  it('matches the canonical Utopia calculation', () => {
    // utopia.fyi, 16px @ 320px -> 20px @ 1240px
    expect(fluid({ minSize: 16, maxSize: 20, minViewport: 320, maxViewport: 1240 })).toBe(
      'clamp(1rem, 0.913rem + 0.4348vw, 1.25rem)',
    );
  });

  it('handles a negative intercept', () => {
    // 18px @ 320 -> 48px @ 1240: slope 30/920, intercept 18 - 10.4348 = 7.5652px
    expect(fluid({ minSize: 18, maxSize: 48, minViewport: 320, maxViewport: 1240 })).toBe(
      'clamp(1.125rem, 0.4728rem + 3.2609vw, 3rem)',
    );
  });

  it('returns a static rem value when the size does not change', () => {
    expect(fluid({ minSize: 16, maxSize: 16, minViewport: 320, maxViewport: 1240 })).toBe('1rem');
  });

  it('throws when the viewport range is degenerate', () => {
    expect(() => fluid({ minSize: 16, maxSize: 20, minViewport: 320, maxViewport: 320 })).toThrow(
      /viewport/i,
    );
  });

  it('orders clamp bounds by value when the size decreases with viewport width', () => {
    // A negative type step legitimately shrinks on wide screens. clamp() takes
    // its bounds in numeric order, so the small end must be the first argument
    // even though it belongs to the large viewport.
    const result = fluid({ minSize: 20, maxSize: 16, minViewport: 320, maxViewport: 1240 });
    expect(result).toBe('clamp(1rem, 1.337rem - 0.4348vw, 1.25rem)');
  });

  it('renders a negative slope as subtraction rather than "+ -"', () => {
    expect(fluid({ minSize: 20, maxSize: 16, minViewport: 320, maxViewport: 1240 })).not.toContain('+ -');
  });
});

describe('typeScale', () => {
  const scale = typeScale({
    minViewport: 320,
    maxViewport: 1240,
    minBase: 16,
    maxBase: 20,
    minRatio: 1.2,
    maxRatio: 1.25,
    steps: [-1, 0, 1, 2],
  });

  it('names steps with a sign-safe key', () => {
    expect(Object.keys(scale)).toEqual(['step--1', 'step-0', 'step-1', 'step-2']);
  });

  it('emits the base size unscaled at step 0', () => {
    expect(scale['step-0']).toBe(fluid({ minSize: 16, maxSize: 20, minViewport: 320, maxViewport: 1240 }));
  });

  it('compounds the ratio per step, independently at each viewport end', () => {
    expect(scale['step-2']).toBe(
      fluid({ minSize: 16 * 1.2 ** 2, maxSize: 20 * 1.25 ** 2, minViewport: 320, maxViewport: 1240 }),
    );
  });

  it('divides by the ratio for negative steps', () => {
    expect(scale['step--1']).toBe(
      fluid({ minSize: 16 / 1.2, maxSize: 20 / 1.25, minViewport: 320, maxViewport: 1240 }),
    );
  });
});

describe('spaceScale', () => {
  const space = spaceScale({
    minViewport: 320,
    maxViewport: 1240,
    minBase: 16,
    maxBase: 20,
    steps: { s: 0.5, m: 1, l: 2 },
  });

  it('scales both ends by the multiplier', () => {
    expect(space['space-l']).toBe(
      fluid({ minSize: 32, maxSize: 40, minViewport: 320, maxViewport: 1240 }),
    );
  });

  it('keys every step with a space- prefix', () => {
    expect(Object.keys(space).sort()).toEqual(['space-l', 'space-m', 'space-s']);
  });
});

describe('tokensToCss', () => {
  it('emits custom properties sorted for a stable diff', () => {
    expect(tokensToCss({ b: '2rem', a: '1rem' })).toBe('  --a: 1rem;\n  --b: 2rem;');
  });

  it('returns an empty string for no tokens', () => {
    expect(tokensToCss({})).toBe('');
  });
});
