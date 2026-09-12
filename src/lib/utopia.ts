/**
 * Fluid type and space scales, following the Utopia approach (utopia.fyi).
 *
 * A fluid value is a straight line between two (viewport, size) points, clamped
 * at both ends. Expressing that as a single `clamp()` means there are no
 * typographic breakpoints to maintain: every size interpolates continuously.
 *
 * Sizes are given in px for legibility and emitted in rem so the result still
 * respects the reader's browser font-size setting.
 */

const ROOT_FONT_SIZE = 16;
const PRECISION = 4;

/** Round for CSS output, dropping trailing zeros so `1.0000rem` reads as `1rem`. */
const round = (value: number): number => Number.parseFloat(value.toFixed(PRECISION));

const rem = (px: number): string => `${round(px / ROOT_FONT_SIZE)}rem`;

export interface FluidInput {
  /** Size in px at (and below) `minViewport`. */
  minSize: number;
  /** Size in px at (and above) `maxViewport`. */
  maxSize: number;
  /** Viewport width in px where the value stops shrinking. */
  minViewport: number;
  /** Viewport width in px where the value stops growing. */
  maxViewport: number;
}

/**
 * Build a single `clamp()` that interpolates between two sizes across a
 * viewport range.
 *
 * The value may legitimately *decrease* with viewport width - a negative type
 * step does exactly that whenever the large-end ratio exceeds the small-end
 * one, so fine print shrinks relative to body text on wide screens. `clamp()`
 * takes its bounds in numeric order regardless of which viewport end each came
 * from, so the bounds are sorted rather than assumed.
 */
export function fluid({ minSize, maxSize, minViewport, maxViewport }: FluidInput): string {
  if (maxViewport === minViewport) {
    throw new Error('fluid(): minViewport and maxViewport must differ, otherwise the slope is undefined');
  }
  if (minSize === maxSize) return rem(minSize);

  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const interceptPx = minSize - slope * minViewport;
  const vw = round(slope * 100);
  const preferred = vw < 0 ? `${rem(interceptPx)} - ${Math.abs(vw)}vw` : `${rem(interceptPx)} + ${vw}vw`;

  const lower = Math.min(minSize, maxSize);
  const upper = Math.max(minSize, maxSize);
  return `clamp(${rem(lower)}, ${preferred}, ${rem(upper)})`;
}

export interface TypeScaleInput extends Pick<FluidInput, 'minViewport' | 'maxViewport'> {
  /** Step-0 size in px at the small end. */
  minBase: number;
  /** Step-0 size in px at the large end. */
  maxBase: number;
  /** Ratio compounded per step at the small end. */
  minRatio: number;
  /** Ratio compounded per step at the large end — usually slightly larger. */
  maxRatio: number;
  /** Steps to emit, e.g. `[-2, -1, 0, 1, 2, 3]`. */
  steps: number[];
}

/**
 * A modular type scale where each end of the viewport range gets its own ratio,
 * so headings grow faster than body text on wide screens without a breakpoint.
 */
export function typeScale({
  minViewport,
  maxViewport,
  minBase,
  maxBase,
  minRatio,
  maxRatio,
  steps,
}: TypeScaleInput): Record<string, string> {
  return Object.fromEntries(
    steps.map((step) => [
      `step-${step}`,
      fluid({
        minSize: minBase * minRatio ** step,
        maxSize: maxBase * maxRatio ** step,
        minViewport,
        maxViewport,
      }),
    ]),
  );
}

export interface SpaceScaleInput extends Pick<FluidInput, 'minViewport' | 'maxViewport'> {
  minBase: number;
  maxBase: number;
  /** Named multipliers of the base space, e.g. `{ s: 0.5, m: 1, l: 2 }`. */
  steps: Record<string, number>;
}

/** A fluid space scale derived from the same base as the type scale. */
export function spaceScale({
  minViewport,
  maxViewport,
  minBase,
  maxBase,
  steps,
}: SpaceScaleInput): Record<string, string> {
  return Object.fromEntries(
    Object.entries(steps).map(([name, multiplier]) => [
      `space-${name}`,
      fluid({
        minSize: minBase * multiplier,
        maxSize: maxBase * multiplier,
        minViewport,
        maxViewport,
      }),
    ]),
  );
}

/** Render tokens as custom property declarations, sorted so diffs stay stable. */
export function tokensToCss(tokens: Record<string, string>): string {
  return Object.keys(tokens)
    .sort()
    .map((name) => `  --${name}: ${tokens[name]};`)
    .join('\n');
}
