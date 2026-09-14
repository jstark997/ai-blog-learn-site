"use client";

import { useId, useState } from "react";

import { Plot } from "@/components/learn/plot/Plot";
import { PlotCurve, PlotGuides, PlotPoint } from "@/components/learn/plot/PlotMarks";
import { formatNumber } from "@/components/learn/plot/scale";
import { cn } from "@/lib/utils/cn";
import { activationList, activations, INPUT_DOMAIN, type ActivationId } from "./activations";

/**
 * The activation function explorer (spec §38.2): pick ReLU, sigmoid or tanh,
 * move an input, and watch the curve and the resulting output together.
 *
 * Everything runs in the browser from two pieces of state — which function, and
 * which input — and every other value on screen is derived from them on render.
 * There is no effect and no second copy of the output: the number in the
 * summary and the marker on the curve are the same computation, so they cannot
 * disagree.
 *
 * Accessibility is part of the component, not a later pass (spec §14.1, §28):
 *
 * - the function selector is a real radio group, so the arrow keys move through
 *   it and a screen reader announces "2 of 3";
 * - the input is a native `<input type="range">`, arrow-operable by definition,
 *   with a visible label;
 * - the segmented buttons show the focus ring their hidden radio receives,
 *   through `has-[:focus-visible]`, so keyboard focus is never invisible;
 * - the plot is one labelled image rather than a thicket of shapes, and the
 *   live region below it carries the state the picture carries — which is the
 *   whole point of the demonstration for a reader who cannot see the curve.
 *
 * The section is a labelled landmark. A lesson has one or two of these and they
 * are the parts a reader most wants to jump to; the `Callout`s, which a lesson
 * may have six of, deliberately are not.
 */
export function ActivationFunctionExplorer({ className }: { className?: string }) {
  const [activationId, setActivationId] = useState<ActivationId>("relu");
  const [input, setInput] = useState(0.75);

  const activation = activations[activationId];
  const output = activation.fn(input);
  const summary = `${activation.name}, input ${formatNumber(input)}, output ${formatNumber(output)}`;

  const titleId = useId();
  const selectorName = useId();
  const sliderId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "my-8 flex flex-col gap-5 rounded-lg border border-rule bg-surface p-4 sm:p-6",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        {/* A paragraph, not a heading: the demo sits inside authored MDX whose
            heading level it cannot know, and `.prose h2` would style and space
            it as a section title. The landmark name comes from it either way. */}
        <p id={titleId} className="text-sm font-semibold tracking-wide uppercase text-muted">
          Activation function explorer
        </p>
        <p className="font-mono text-base text-ink">{activation.equation}</p>
      </header>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-medium text-ink">Function</legend>
          <div className="flex flex-wrap gap-2">
            {activationList.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "cursor-pointer rounded-md border border-rule px-3 py-1.5 text-sm font-medium",
                  "transition-colors hover:border-accent hover:text-accent",
                  "has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                  "has-[:focus-visible]:outline-accent",
                )}
              >
                <input
                  type="radio"
                  name={selectorName}
                  value={option.id}
                  checked={option.id === activationId}
                  onChange={() => setActivationId(option.id)}
                  className="sr-only"
                />
                {option.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="min-w-0 grow">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <label htmlFor={sliderId} className="text-sm font-medium text-ink">
              Input z
            </label>
            {/* The slider announces its own value; this is the sighted reader's
                copy of it, so it stays out of the accessibility tree. */}
            <span aria-hidden="true" className="font-mono text-sm text-muted">
              {formatNumber(input)}
            </span>
          </div>
          <input
            id={sliderId}
            type="range"
            min={INPUT_DOMAIN[0]}
            max={INPUT_DOMAIN[1]}
            step={0.05}
            value={input}
            onChange={(event) => setInput(Number(event.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      {/* The plot scales with its box, and so does the text inside its
          `viewBox`. Capping the width keeps the tick labels between roughly 9
          and 15 px — below the body text at 375 px, never above it. */}
      <div className="mx-auto w-full max-w-md">
        <Plot
          xDomain={INPUT_DOMAIN}
          yDomain={activation.range}
          xTickCount={6}
          label={`${activation.name} plotted for inputs from ${formatNumber(INPUT_DOMAIN[0])} to ${formatNumber(INPUT_DOMAIN[1])}, with the current input marked on the curve.`}
          xLabel="z"
          yLabel="output"
        >
          {(scales) => (
            <>
              <PlotCurve scales={scales} fn={activation.fn} />
              <PlotGuides scales={scales} x={input} y={output} />
              <PlotPoint scales={scales} x={input} y={output} />
            </>
          )}
        </Plot>
      </div>

      <p aria-live="polite" className="font-mono text-sm text-ink">
        {summary}
      </p>
    </section>
  );
}

export default ActivationFunctionExplorer;
