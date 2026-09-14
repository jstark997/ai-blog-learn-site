import type { Interval, Point } from "@/components/learn/plot/scale";

/**
 * The arithmetic behind the gradient descent demonstration (spec §38.1), kept
 * apart from the component that draws it so the loop is testable on its own —
 * and so the two ways a run can end, convergence and divergence, are decided in
 * one place rather than in a handler and again in a timer.
 *
 * The objective is `f(x) = x²`. It is the smallest function that still shows
 * everything the learning rate does: one minimum, a gradient that shrinks as
 * you approach it, and an update that is exactly `x ← x(1 − 2η)`, so the reader
 * can be told *why* η > 1 diverges rather than only shown that it does.
 */

/** What is being minimized, and the derivative the step is taken against. */
export const objective = {
  /** Plain text, not KaTeX: a demo must not ship a formula renderer (spec §30). */
  equation: "f(x) = x²",
  derivative: "f′(x) = 2x",
  /** The update rule, with a true minus and a middle dot rather than ASCII. */
  rule: "x ← x − η · f′(x)",
  fn: (x: number) => x * x,
  gradient: (x: number) => 2 * x,
} as const;

/** The window the parabola is framed in. `f(±5) = 25`, so the top allows it. */
export const X_DOMAIN: Interval = [-5, 5];
export const Y_DOMAIN: Interval = [-1.5, 26];

/** The starting points the slider offers, kept inside the plotted window. */
export const START_RANGE: Interval = [-4, 4];
export const START_STEP = 0.25;
export const DEFAULT_START = 2.5;

/**
 * The learning rates the slider offers.
 *
 * For this objective the update is `x ← x(1 − 2η)`, so the behaviour is decided
 * entirely by `|1 − 2η|`: below 0.5 the steps shrink monotonically, at exactly
 * 0.5 one step lands on the minimum, above 0.5 they overshoot and alternate
 * sides, at 1 they oscillate forever between ±x₀, and above 1 they grow. The
 * range therefore has to reach past 1 — watching it fail is the point — and the
 * step size divides into every one of those thresholds.
 */
export const LEARNING_RATE_RANGE: Interval = [0.05, 1.2];
export const LEARNING_RATE_STEP = 0.05;
export const DEFAULT_LEARNING_RATE = 0.1;

/**
 * Where a run stops.
 *
 * `MAX_STEPS` is a budget, so that "start" always terminates: the slowest rate
 * offered, 0.05, needs about 73 steps to converge from the far end of the
 * slider. `DIVERGENCE_LIMIT` is the other end — once |x| passes it the run is
 * declared diverged and no further step is taken, which is what keeps the
 * arithmetic finite: iterating past `Infinity` would compute `∞ − ∞` and put a
 * `NaN` in the readout.
 */
export const MAX_STEPS = 80;
export const DIVERGENCE_LIMIT = 1_000;
/** Below this the steps are no longer visible, and the run is done. */
export const CONVERGENCE_TOLERANCE = 0.001;

/**
 * Where a run has got to. `"stepping"` is the only status a further step may be
 * taken from; the other three each mean something different to the reader, and
 * the demo says which.
 */
export type RunStatus = "stepping" | "converged" | "diverged" | "exhausted";

/** One gradient descent step. */
export function step(x: number, learningRate: number): number {
  return x - learningRate * objective.gradient(x);
}

/** The visited points, oldest first. A run is its path; nothing else is state. */
export type Path = readonly number[];

/** The path a run starts as: the chosen starting point, no steps taken. */
export function startPath(start: number): number[] {
  return [start];
}

/**
 * The path with one more step on it, or the same path when the run is over.
 *
 * Total, rather than throwing or returning null: it is called from a click
 * handler and from a timer, and neither has anything useful to do with a
 * refusal that the status does not already say.
 */
export function extendPath(path: Path, learningRate: number): number[] {
  if (statusOf(path) !== "stepping") return [...path];

  return [...path, step(current(path), learningRate)];
}

/** Runs to whichever end comes first — used when animation is not wanted. */
export function runToEnd(path: Path, learningRate: number): number[] {
  let result = [...path];

  while (statusOf(result) === "stepping") {
    result = extendPath(result, learningRate);
  }

  return result;
}

/** The current parameter: the last point of the path. */
export function current(path: Path): number {
  return path[path.length - 1] ?? Number.NaN;
}

/** How many steps have been taken — the path's length, less its start. */
export function stepCount(path: Path): number {
  return Math.max(path.length - 1, 0);
}

/** The current loss, `f(x)`. */
export function loss(path: Path): number {
  return objective.fn(current(path));
}

/**
 * Why a run has stopped, or that it has not.
 *
 * Divergence is checked first: a diverged run has also usually exhausted its
 * budget, and "diverged" is the reading that explains what the reader saw.
 */
export function statusOf(path: Path): RunStatus {
  const x = current(path);

  if (!Number.isFinite(x) || Math.abs(x) > DIVERGENCE_LIMIT) return "diverged";
  if (Math.abs(x) < CONVERGENCE_TOLERANCE) return "converged";
  if (stepCount(path) >= MAX_STEPS) return "exhausted";
  return "stepping";
}

/** The path as points on the curve, for the marks that draw it. */
export function pathPoints(path: Path): Point[] {
  return path.map((x) => [x, objective.fn(x)]);
}
