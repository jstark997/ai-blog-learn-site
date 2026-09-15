"use client";

import { useEffect, useId, useState } from "react";

import { Plot } from "@/components/learn/plot/Plot";
import { PlotCurve, PlotGuides, PlotPoint, PlotPolyline } from "@/components/learn/plot/PlotMarks";
import { formatNumber } from "@/components/learn/plot/scale";
import { usePrefersReducedMotion } from "@/components/learn/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";
import {
  current,
  DEFAULT_LEARNING_RATE,
  DEFAULT_START,
  extendPath,
  LEARNING_RATE_RANGE,
  LEARNING_RATE_STEP,
  loss,
  MAX_STEPS,
  objective,
  pathPoints,
  runToEnd,
  START_RANGE,
  START_STEP,
  startPath,
  statusOf,
  stepCount,
  X_DOMAIN,
  Y_DOMAIN,
  type RunStatus,
} from "./gradientDescent";

/**
 * The gradient descent demonstration (spec §38.1): choose a starting point and
 * a learning rate, then step — or run — down `f(x) = x²` and watch what the
 * learning rate does to the descent.
 *
 * The learning rate reaches past 1 on purpose. For this objective every step is
 * `x ← x(1 − 2η)`, so η above 1 makes each step overshoot by more than the last
 * and the run runs away; seeing that happen is the lesson, and a slider that
 * could only converge would teach half of it.
 *
 * One piece of state is the run: `path`, the parameters visited so far. The
 * step number, the current x, the loss, and whether the run has converged,
 * diverged or used its budget are all read off it during render, so the number
 * in the readout and the marker on the curve cannot disagree.
 *
 * Accessibility (spec §14.1, §28):
 *
 * - both parameters are native sliders with visible labels, so the arrow keys
 *   work without a line of key handling;
 * - start, step and reset are ordinary buttons, and stepping never depends on
 *   the animation — which is also what makes the demo usable under
 *   `prefers-reduced-motion`, where "start" applies the whole run at once
 *   instead of animating it;
 * - the plot is one labelled image, and the state it shows is carried in text
 *   by a live region — silent while the animation is running, so that a run
 *   announces where it ended rather than interrupting eighty times.
 */

/** How long one animated step takes. Eighty of them run in under twenty seconds. */
const STEP_INTERVAL_MS = 220;

export function GradientDescentDemo({ className }: { className?: string }) {
  const [start, setStart] = useState(DEFAULT_START);
  const [learningRate, setLearningRate] = useState(DEFAULT_LEARNING_RATE);
  const [path, setPath] = useState(() => startPath(DEFAULT_START));
  const [isStarted, setIsStarted] = useState(false);

  const prefersReducedMotion = usePrefersReducedMotion();

  const status = statusOf(path);
  const x = current(path);
  const isRunning = isStarted && status === "stepping";
  const readout = `step ${stepCount(path)}, x = ${formatNumber(x, 3)}, loss = ${formatNumber(loss(path), 3)}`;

  /**
   * The animation, and the only effect in the demo: an interval is an external
   * thing to be started and stopped, not a value to be derived. It stops on its
   * own when `isRunning` goes false — which happens when the reader pauses, and
   * equally when the run converges, diverges or reaches its step budget, since
   * the status is computed from the path the interval itself is extending.
   */
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setPath((previous) => extendPath(previous, learningRate));
    }, STEP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isRunning, learningRate]);

  function handleStartChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    setStart(value);
    restart(value);
  }

  function handleLearningRateChange(event: React.ChangeEvent<HTMLInputElement>) {
    setLearningRate(Number(event.target.value));
    restart(start);
  }

  /** A parameter change is a new run: the old path was taken under old rules. */
  function restart(from: number) {
    setPath(startPath(from));
    setIsStarted(false);
  }

  function handleStep() {
    setPath((previous) => extendPath(previous, learningRate));
  }

  function handleStartOrPause() {
    // With reduced motion there is no animation to start, so the run is applied
    // in one go and the reader reads the end of it. Stepping is unaffected.
    if (prefersReducedMotion) {
      setPath((previous) => runToEnd(previous, learningRate));
      return;
    }

    setIsStarted((previous) => !previous);
  }

  function handleReset() {
    restart(start);
  }

  const titleId = useId();
  const startId = useId();
  const rateId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "my-8 flex flex-col gap-5 rounded-lg border border-rule bg-surface p-4 sm:p-6",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        {/* A paragraph rather than a heading, for the reason in docs/decisions.md:
            the demo sits inside authored MDX whose heading level it cannot know. */}
        <p id={titleId} className="text-sm font-semibold tracking-wide uppercase text-muted">
          Gradient descent demo
        </p>
        <p className="font-mono text-base text-ink">
          {objective.equation}, {objective.derivative}
        </p>
        <p className="font-mono text-sm text-muted">{objective.rule}</p>
      </header>

      <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
        <Slider
          id={startId}
          label="Starting point x₀"
          value={start}
          min={START_RANGE[0]}
          max={START_RANGE[1]}
          step={START_STEP}
          onChange={handleStartChange}
        />
        <Slider
          id={rateId}
          label="Learning rate η"
          value={learningRate}
          min={LEARNING_RATE_RANGE[0]}
          max={LEARNING_RATE_RANGE[1]}
          step={LEARNING_RATE_STEP}
          onChange={handleLearningRateChange}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleStartOrPause}
          disabled={status !== "stepping"}
          className={cn(
            "rounded-md border border-accent bg-accent px-3 py-1.5 text-sm font-medium",
            "text-on-accent transition-opacity hover:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isRunning ? "Pause" : prefersReducedMotion ? "Run to the end" : "Start"}
        </button>
        <button
          type="button"
          onClick={handleStep}
          disabled={status !== "stepping"}
          className={SECONDARY_BUTTON}
        >
          Step
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={stepCount(path) === 0}
          className={SECONDARY_BUTTON}
        >
          Reset
        </button>
      </div>

      <div className="mx-auto w-full max-w-md">
        <Plot
          xDomain={X_DOMAIN}
          yDomain={Y_DOMAIN}
          label="The loss curve f(x) = x squared, with the steps taken so far joined from the starting point and the current parameter marked on the curve. Steps that leave the plotted range are not drawn."
          xLabel="x"
          yLabel="f(x)"
        >
          {(scales) => (
            <>
              <PlotCurve scales={scales} fn={objective.fn} />
              {/* The steps, joined in order: with a large learning rate they
                  cross the valley from side to side, which is the picture. The
                  marks keep their default colours — the ink path reads over the
                  accent curve, and `cn` concatenates rather than resolving a
                  conflict between two utilities of the same family. */}
              <PlotPolyline scales={scales} points={pathPoints(path)} />
              {path.map((visited, index) => (
                <PlotPoint
                  key={index}
                  scales={scales}
                  x={visited}
                  y={objective.fn(visited)}
                  radius={2}
                />
              ))}
              <PlotGuides scales={scales} x={x} y={loss(path)} />
              <PlotPoint scales={scales} x={x} y={loss(path)} />
            </>
          )}
        </Plot>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        {/* The sighted reader's copy. The announced copy below carries the same
            text, so this one stays out of the accessibility tree. */}
        <p aria-hidden="true" className="font-mono text-ink">
          {readout}
        </p>
        <p aria-live="polite" className="sr-only">
          {isRunning ? "Running." : readout}
        </p>
        {status !== "stepping" && <p className="text-muted">{statusMessage(status)}</p>}
      </div>
    </section>
  );
}

const SECONDARY_BUTTON = cn(
  "rounded-md border border-rule px-3 py-1.5 text-sm font-medium text-ink",
  "transition-colors hover:border-accent hover:text-accent",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-rule",
  "disabled:hover:text-ink",
);

/** A labelled range input, with the sighted reader's copy of its value. */
function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="min-w-0 grow">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {/* The slider announces its own value; this copy is for the eye only. */}
        <span aria-hidden="true" className="font-mono text-sm text-muted">
          {formatNumber(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full accent-accent"
      />
    </div>
  );
}

/** What the reader is told when a run has stopped, and why it stopped. */
function statusMessage(status: Exclude<RunStatus, "stepping">): string {
  switch (status) {
    case "converged":
      return "Converged: the gradient is now too small to move x any further.";
    case "diverged":
      return "Diverged: each step overshoots the minimum by more than the last, so x runs away and the point leaves the plot. Reduce the learning rate below 1.";
    case "exhausted":
      return `Stopped after ${MAX_STEPS} steps without reaching the minimum. A smaller learning rate needs more steps than this demonstration takes.`;
  }
}

export default GradientDescentDemo;
