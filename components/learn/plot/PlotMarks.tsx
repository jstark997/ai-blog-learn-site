import { cn } from "@/lib/utils/cn";
import type { PlotScales } from "./Plot";
import { sample, toPathData, type Point } from "./scale";

/**
 * What gets drawn inside a `Plot`: a sampled function, a run of explicit
 * points, a marker, and the dashed lines that tie a marker back to the axes.
 *
 * Every mark takes the `scales` its `Plot` hands to its children, and every
 * mark drops what it cannot draw. A value outside the y domain, or one that is
 * `NaN` or `Infinity`, becomes a gap in the line rather than a coordinate:
 * an SVG path containing a single invalid number is discarded whole by the
 * browser, so an unhandled divergence would erase the curve instead of showing
 * that it left the frame.
 *
 * That is also why nothing here clips with a `clipPath`: an id shared between
 * two plots on one page is invalid markup, and dropping the samples that fall
 * outside the frame achieves the same picture without one.
 */

type MarkProps = {
  scales: PlotScales;
  className?: string;
};

/**
 * A function plotted across the whole x domain.
 *
 * `samples` is the number of segments the curve is drawn with; the default is
 * fine for a smooth function over a screen-width plot, and a kink such as
 * ReLU's at the origin lands within half a segment of its true position.
 */
export function PlotCurve({
  scales,
  fn,
  samples = 240,
  className,
}: MarkProps & {
  fn: (x: number) => number;
  samples?: number;
}) {
  return (
    <path
      d={toPathData(clipToPlot(sample(fn, scales.xDomain, samples), scales), scales.x, scales.y)}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("stroke-accent", className)}
    />
  );
}

/** A run of explicit points — an optimizer's path, say — joined in order. */
export function PlotPolyline({
  scales,
  points,
  className,
}: MarkProps & { points: readonly Point[] }) {
  return (
    <path
      d={toPathData(clipToPlot(points, scales), scales.x, scales.y)}
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("stroke-ink", className)}
    />
  );
}

/** A single marked point. Nothing is drawn if it falls outside the plot. */
export function PlotPoint({
  scales,
  x,
  y,
  radius = 4,
  className,
}: MarkProps & { x: number; y: number; radius?: number }) {
  if (!isDrawable([x, y], scales)) return null;

  return (
    <circle
      cx={scales.x(x)}
      cy={scales.y(y)}
      r={radius}
      strokeWidth={2}
      className={cn("fill-canvas stroke-accent", className)}
    />
  );
}

/**
 * Dashed lines from a point to each axis — the "read the value off the graph"
 * construction, which is what makes a plotted output legible as a number.
 */
export function PlotGuides({ scales, x, y, className }: MarkProps & { x: number; y: number }) {
  if (!isDrawable([x, y], scales)) return null;

  const { area } = scales;
  const [pixelX, pixelY] = [scales.x(x), scales.y(y)];
  // The guides run back to the zero lines, or to the frame when a domain does
  // not cross zero and there is no axis inside the plot to run back to.
  const baseX = clamp(scales.x(0), area.left, area.right);
  const baseY = clamp(scales.y(0), area.top, area.bottom);

  return (
    <g
      strokeWidth={1}
      strokeDasharray="3 3"
      className={cn("stroke-accent opacity-60", className)}
    >
      <line x1={pixelX} y1={baseY} x2={pixelX} y2={pixelY} />
      <line x1={baseX} y1={pixelY} x2={pixelX} y2={pixelY} />
    </g>
  );
}

/**
 * Replaces every point the frame cannot hold with one `toPathData` will break
 * the line at. The x values come from the domain already; y is the one that
 * runs away.
 */
function clipToPlot(points: readonly Point[], scales: PlotScales): Point[] {
  return points.map((point) => (isDrawable(point, scales) ? point : [point[0], Number.NaN]));
}

function isDrawable([x, y]: Point, { xDomain, yDomain }: PlotScales): boolean {
  return within(x, xDomain) && within(y, yDomain);
}

function within(value: number, [a, b]: PlotScales["xDomain"]): boolean {
  return Number.isFinite(value) && value >= Math.min(a, b) && value <= Math.max(a, b);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
