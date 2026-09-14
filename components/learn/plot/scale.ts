/**
 * The arithmetic behind every plot in `components/learn`: mapping a value in
 * data space to a coordinate in the SVG's user space, choosing round numbers to
 * label an axis with, and sampling a function into a path.
 *
 * Pure functions, no JSX and no React, so the parts most likely to be wrong are
 * the parts a unit test can reach directly. `Plot` and the marks in
 * `PlotMarks.tsx` are thin layers over this file.
 *
 * Non-finite values are this module's other job. A demo that lets the reader
 * choose a divergent learning rate (phase 12) will produce `Infinity` and
 * `NaN`, and an SVG path containing either is invalid and silently drops the
 * whole shape — so `toPathData` breaks the line at a gap instead.
 */

/** A closed range, `[min, max]`, in data space or in user space. */
export type Interval = readonly [number, number];

/** Maps a value in data space to a coordinate in the SVG's user space. */
export type Scale = (value: number) => number;

/** A point in data space, `[x, y]`. */
export type Point = readonly [number, number];

/**
 * A linear mapping from `domain` to `range`.
 *
 * Values outside the domain map outside the range rather than being clamped:
 * clipping is the plot's decision, not the scale's, and a curve that leaves the
 * frame should be cut by the frame.
 *
 * A zero-width domain has no gradient to apply, so everything maps to the start
 * of the range instead of to `NaN`.
 */
export function linearScale(domain: Interval, range: Interval): Scale {
  const [domainStart, domainEnd] = domain;
  const [rangeStart, rangeEnd] = range;
  const span = domainEnd - domainStart;

  if (span === 0) return () => rangeStart;

  const ratio = (rangeEnd - rangeStart) / span;
  return (value) => rangeStart + (value - domainStart) * ratio;
}

/**
 * Round numbers to label an axis with: roughly `count` of them, spaced 1, 2 or
 * 5 times a power of ten, and always including zero when the domain crosses it.
 *
 * `count` is a target, not a promise — the point is that a reader sees `-6 -3 0
 * 3 6` rather than `-6 -3.43 -0.86 1.71`.
 */
export function ticks(domain: Interval, count = 5): number[] {
  const [start, end] = domain;
  const span = Math.abs(end - start);

  if (span === 0 || count < 1 || !Number.isFinite(span)) return [];

  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized > 5 ? 10 : normalized > 2 ? 5 : normalized > 1 ? 2 : 1) * magnitude;

  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const result: number[] = [];

  for (let tick = Math.ceil(low / step) * step; tick <= high + step / 1e6; tick += step) {
    // Accumulated float error would print `0.30000000000000004` on an axis.
    result.push(round(tick));
  }

  return result;
}

/**
 * Samples `fn` across `domain` at `count + 1` evenly spaced points.
 *
 * Whatever `fn` returns is kept, `NaN` and `Infinity` included: deciding what
 * an undefined value means belongs to the caller, and `toPathData` already
 * knows to break the line where one appears.
 */
export function sample(fn: (x: number) => number, domain: Interval, count = 240): Point[] {
  const [start, end] = domain;
  const points: Point[] = [];

  for (let index = 0; index <= count; index += 1) {
    const x = start + ((end - start) * index) / count;
    points.push([x, fn(x)]);
  }

  return points;
}

/**
 * Projects data-space points through the scales and joins them into an SVG
 * `d` attribute.
 *
 * A point that does not project to two finite numbers ends the current
 * subpath, and the next usable point starts a new one with `M`. So a function
 * with a pole, or an optimizer that has diverged to `Infinity`, leaves a gap in
 * the line rather than deleting it: one invalid coordinate anywhere in a `d`
 * attribute makes a browser discard the entire path.
 */
export function toPathData(points: readonly Point[], x: Scale, y: Scale): string {
  const commands: string[] = [];
  let penIsDown = false;

  for (const [dataX, dataY] of points) {
    const pixelX = x(dataX);
    const pixelY = y(dataY);

    if (!Number.isFinite(pixelX) || !Number.isFinite(pixelY)) {
      penIsDown = false;
      continue;
    }

    commands.push(`${penIsDown ? "L" : "M"}${round(pixelX, 2)} ${round(pixelY, 2)}`);
    penIsDown = true;
  }

  return commands.join(" ");
}

/**
 * Formats a number for an axis label or a readout: fixed to `digits` decimals,
 * then stripped of trailing zeros, so an axis reads `0.5` and `1` rather than
 * `0.50` and `1.00`. `-0` prints as `0`.
 */
export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "undefined" : value > 0 ? "∞" : "−∞";

  const rounded = round(value, digits);
  return String(rounded === 0 ? 0 : rounded);
}

/** Rounds away the float noise that decimal arithmetic on binary floats leaves. */
function round(value: number, digits = 10): number {
  return Number(value.toFixed(digits));
}
