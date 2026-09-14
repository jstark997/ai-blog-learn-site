import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { formatNumber, linearScale, ticks, type Interval, type Scale } from "./scale";

/**
 * The frame every demonstration plots into: axes, grid, tick labels, and the
 * two scales that turn data into coordinates (spec §14.1 — SVG, not canvas).
 *
 * The drawing surface is a fixed `viewBox` scaled to whatever width it is given,
 * so one set of user-space numbers describes the plot at 375 px and at 1280 px
 * and nothing has to be measured in the browser. That is also why this file
 * holds no state and calls no hook: it renders identically on the server, and
 * the demo above it is the only Client Component in the tree.
 *
 * Marks are children, not props, and reach the scales through a render prop:
 *
 * ```tsx
 * <Plot xDomain={[-6, 6]} yDomain={[-1.2, 1.2]} label="tanh">
 *   {(scales) => <PlotCurve scales={scales} fn={Math.tanh} />}
 * </Plot>
 * ```
 *
 * Accessibility (spec §14.1, §28): the SVG is one labelled image rather than a
 * tree of shapes an assistive technology must narrate. The label describes the
 * picture; the *state* — which function, which input, which output — belongs in
 * the demo's live text summary, so that the reading of a plot does not change
 * every time a slider moves by 0.05.
 */

/** The drawing surface, in user space. Every number below is in these units. */
const VIEW = { width: 300, height: 200 } as const;

/** Room outside the plot area for tick labels and axis titles. */
const PADDING = { top: 14, right: 14, bottom: 34, left: 36 } as const;

/**
 * The plot area, in user space. Exported because it is what a caller needs to
 * predict where a value will be drawn — a test checking that a readout and a
 * marker agree, for instance.
 */
export const PLOT_AREA = {
  left: PADDING.left,
  right: VIEW.width - PADDING.right,
  top: PADDING.top,
  bottom: VIEW.height - PADDING.bottom,
} as const;

/**
 * What a mark needs to place itself: the two scales, and the domains and pixel
 * bounds it may want to clip against.
 */
export type PlotScales = {
  x: Scale;
  y: Scale;
  xDomain: Interval;
  yDomain: Interval;
  area: typeof PLOT_AREA;
};

type PlotProps = {
  xDomain: Interval;
  yDomain: Interval;
  /** The plot's accessible name — what the picture shows, not its live state. */
  label: string;
  /** Axis titles, e.g. `z` and `f(z)`. */
  xLabel?: string;
  yLabel?: string;
  /** Target number of labelled ticks; the spacing is rounded to a round number. */
  xTickCount?: number;
  yTickCount?: number;
  className?: string;
  children: (scales: PlotScales) => ReactNode;
};

export function Plot({
  xDomain,
  yDomain,
  label,
  xLabel,
  yLabel,
  xTickCount = 5,
  yTickCount = 5,
  className,
  children,
}: PlotProps) {
  const scales: PlotScales = {
    // The y range is inverted: SVG counts downwards, mathematics upwards.
    x: linearScale(xDomain, [PLOT_AREA.left, PLOT_AREA.right]),
    y: linearScale(yDomain, [PLOT_AREA.bottom, PLOT_AREA.top]),
    xDomain,
    yDomain,
    area: PLOT_AREA,
  };

  const xTicks = ticks(xDomain, xTickCount);
  const yTicks = ticks(yDomain, yTickCount);

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      role="img"
      aria-label={label}
      className={cn("h-auto w-full", className)}
    >
      <g className="stroke-rule" strokeWidth={0.5}>
        {xTicks.map((tick) => (
          <line
            key={tick}
            x1={scales.x(tick)}
            x2={scales.x(tick)}
            y1={PLOT_AREA.top}
            y2={PLOT_AREA.bottom}
          />
        ))}
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={PLOT_AREA.left}
            x2={PLOT_AREA.right}
            y1={scales.y(tick)}
            y2={scales.y(tick)}
          />
        ))}
        <rect
          x={PLOT_AREA.left}
          y={PLOT_AREA.top}
          width={PLOT_AREA.right - PLOT_AREA.left}
          height={PLOT_AREA.bottom - PLOT_AREA.top}
          fill="none"
        />
      </g>

      {/* The zero lines, drawn over the grid: on these plots they are the axes. */}
      <g className="stroke-muted" strokeWidth={0.75}>
        {contains(yDomain, 0) && (
          <line x1={PLOT_AREA.left} x2={PLOT_AREA.right} y1={scales.y(0)} y2={scales.y(0)} />
        )}
        {contains(xDomain, 0) && (
          <line x1={scales.x(0)} x2={scales.x(0)} y1={PLOT_AREA.top} y2={PLOT_AREA.bottom} />
        )}
      </g>

      <g className="fill-muted text-[10px]">
        {xTicks.map((tick) => (
          <text key={tick} x={scales.x(tick)} y={PLOT_AREA.bottom + 12} textAnchor="middle">
            {formatNumber(tick)}
          </text>
        ))}
        {yTicks.map((tick) => (
          <text
            key={tick}
            x={PLOT_AREA.left - 5}
            y={scales.y(tick)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {formatNumber(tick)}
          </text>
        ))}
        {xLabel !== undefined && (
          <text x={(PLOT_AREA.left + PLOT_AREA.right) / 2} y={VIEW.height - 4} textAnchor="middle">
            {xLabel}
          </text>
        )}
        {yLabel !== undefined && (
          <text
            x={10}
            y={(PLOT_AREA.top + PLOT_AREA.bottom) / 2}
            textAnchor="middle"
            transform={`rotate(-90 10 ${(PLOT_AREA.top + PLOT_AREA.bottom) / 2})`}
          >
            {yLabel}
          </text>
        )}
      </g>

      {children(scales)}
    </svg>
  );
}

/** Whether a domain spans `value`, whichever way round its bounds are given. */
function contains(domain: Interval, value: number): boolean {
  return Math.min(...domain) <= value && value <= Math.max(...domain);
}
