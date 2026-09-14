import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GradientDescentDemo } from "@/components/learn/neural-networks/GradientDescentDemo";
import {
  CONVERGENCE_TOLERANCE,
  DEFAULT_LEARNING_RATE,
  DEFAULT_START,
  DIVERGENCE_LIMIT,
  extendPath,
  LEARNING_RATE_RANGE,
  MAX_STEPS,
  runToEnd,
  startPath,
  statusOf,
  step,
} from "@/components/learn/neural-networks/gradientDescent";

/**
 * The second educational demonstration (spec §38.1). What is asserted here is
 * what a human cannot check by looking once: that a step moves the parameter
 * the way the gradient says it should, that reset really restores the starting
 * state, and — the reason the demo is worth building — that a learning rate
 * chosen to fail fails *safely*, leaving a readable number on screen rather
 * than `NaN`, `Infinity` or a thrown error.
 *
 * Keyboard operation is covered by *what* the controls are: native sliders and
 * native buttons. jsdom implements neither range dragging nor the arrow keys on
 * a slider, so a test that pressed one would prove only that jsdom does nothing.
 */

/** Reads the demo's state back out of its readout, e.g. `step 3, x = 1.28…`. */
function readout(): { step: number; x: number; loss: number } {
  const copies = screen.getAllByText(/^step \d+, x = /);
  const text = copies[0].textContent ?? "";
  const match = /^step (\d+), x = (−?-?[\d.]+), loss = (−?-?[\d.]+)$/.exec(text);

  if (match === null) throw new Error(`the readout does not read as expected: "${text}"`);

  // The announced copy and the visible one are the same text, or the demo is
  // telling a screen reader something other than what it is showing.
  for (const copy of copies) expect(copy).toHaveTextContent(text);

  return { step: Number(match[1]), x: Number(match[2]), loss: Number(match[3]) };
}

function setSlider(name: RegExp | string, value: number): void {
  fireEvent.change(screen.getByRole("slider", { name }), { target: { value: String(value) } });
}

function click(name: RegExp | string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Replaces `matchMedia` so the reduced-motion branch can be exercised. */
function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the descent loop", () => {
  it("steps against the gradient, by the learning rate", () => {
    // f(x) = x², so f′(x) = 2x and one step is exactly x(1 − 2η).
    expect(step(2, 0.1)).toBeCloseTo(1.6);
    expect(step(-2, 0.1)).toBeCloseTo(-1.6);
    expect(step(2, 0.5)).toBeCloseTo(0);
  });

  it("calls a run converged when the steps stop moving x", () => {
    expect(statusOf(runToEnd(startPath(2), 0.5))).toBe("converged");
    expect(Math.abs(runToEnd(startPath(3), 0.1).at(-1) ?? NaN)).toBeLessThan(
      CONVERGENCE_TOLERANCE,
    );
  });

  it("calls a run diverged, and stops it, rather than iterating to NaN", () => {
    const path = runToEnd(startPath(2), LEARNING_RATE_RANGE[1]);

    expect(statusOf(path)).toBe("diverged");
    expect(path.every(Number.isFinite)).toBe(true);
    expect(Math.abs(path.at(-1) ?? NaN)).toBeGreaterThan(DIVERGENCE_LIMIT);
    // The guard is what keeps it finite: one more step would be ∞ − ∞ = NaN.
    expect(extendPath(path, LEARNING_RATE_RANGE[1])).toEqual(path);
  });

  it("gives every rate the slider offers a budget it terminates within", () => {
    for (let rate = LEARNING_RATE_RANGE[0]; rate <= LEARNING_RATE_RANGE[1]; rate += 0.05) {
      const path = runToEnd(startPath(4), rate);

      expect(path.length).toBeLessThanOrEqual(MAX_STEPS + 1);
      expect(statusOf(path)).not.toBe("stepping");
    }
  });
});

describe("GradientDescentDemo", () => {
  it("names itself, so a reader can jump to it", () => {
    render(<GradientDescentDemo />);

    expect(screen.getByRole("region", { name: "Gradient descent demo" })).toBeInTheDocument();
  });

  it("opens at the starting point, with no steps taken", () => {
    render(<GradientDescentDemo />);

    expect(readout()).toEqual({ step: 0, x: DEFAULT_START, loss: DEFAULT_START ** 2 });
  });

  it("labels both parameters, and lets the learning rate reach a divergent one", () => {
    render(<GradientDescentDemo />);

    expect(screen.getByRole("slider", { name: /Starting point/ })).toHaveValue(
      String(DEFAULT_START),
    );

    const rate = screen.getByRole("slider", { name: /Learning rate/ });

    expect(rate).toHaveValue(String(DEFAULT_LEARNING_RATE));
    expect(rate).toHaveAttribute("min", String(LEARNING_RATE_RANGE[0]));
    // Above 1, |1 − 2η| > 1 and the run runs away: the pedagogical point.
    expect(Number(rate.getAttribute("max"))).toBeGreaterThan(1);
  });

  it("moves x towards the minimum, from either side", () => {
    render(<GradientDescentDemo />);

    click("Step");
    // 2.5 − 0.1 × 5 = 2.0, and the loss falls with it.
    expect(readout()).toEqual({ step: 1, x: 2, loss: 4 });

    setSlider(/Starting point/, -3);
    click("Step");

    const after = readout();
    expect(after.step).toBe(1);
    expect(after.x).toBeCloseTo(-2.4);
    expect(after.x).toBeGreaterThan(-3);
  });

  it("restores the starting state on reset", () => {
    render(<GradientDescentDemo />);

    click("Step");
    click("Step");
    expect(readout().step).toBe(2);

    click("Reset");

    expect(readout()).toEqual({ step: 0, x: DEFAULT_START, loss: DEFAULT_START ** 2 });
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("starts a new run when either parameter changes", () => {
    render(<GradientDescentDemo />);

    click("Step");
    setSlider(/Learning rate/, 0.5);

    expect(readout()).toEqual({ step: 0, x: DEFAULT_START, loss: DEFAULT_START ** 2 });

    click("Step");
    // η = 0.5 lands on the minimum in a single step.
    expect(readout().x).toBe(0);
    expect(screen.getByText(/^Converged/)).toBeInTheDocument();
  });

  it("diverges at a large learning rate without crashing or showing NaN", () => {
    const { container } = render(<GradientDescentDemo />);

    setSlider(/Learning rate/, LEARNING_RATE_RANGE[1]);

    for (let attempt = 0; attempt < MAX_STEPS; attempt += 1) {
      if (screen.getByRole("button", { name: "Step" }).hasAttribute("disabled")) break;
      click("Step");
    }

    const final = readout();

    expect(Number.isFinite(final.x)).toBe(true);
    expect(Math.abs(final.x)).toBeGreaterThan(DIVERGENCE_LIMIT);
    expect(Number.isFinite(final.loss)).toBe(true);
    expect(screen.getByText(/^Diverged/)).toBeInTheDocument();
    // Neither the formatter's words for a non-finite number, nor a raw NaN.
    expect(container.textContent).not.toMatch(/NaN|undefined|∞/);
    // The run is over, and the two controls that would continue it say so.
    expect(screen.getByRole("button", { name: "Step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });

  it("keeps the plot when the point has left it", () => {
    const { container } = render(<GradientDescentDemo />);

    setSlider(/Learning rate/, LEARNING_RATE_RANGE[1]);
    click("Step");
    click("Step");
    click("Step");

    // The curve is still drawn — the marks drop what they cannot draw rather
    // than emitting a path with an out-of-range coordinate in it, which a
    // browser would discard whole.
    expect(container.querySelector("path")?.getAttribute("d")).toMatch(/^M[\d.]+ [\d.]+/);
    expect(readout().step).toBe(3);
  });

  it("animates a run, and pauses where it is", () => {
    vi.useFakeTimers();
    render(<GradientDescentDemo />);

    click("Start");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(1_000));
    const running = readout();
    expect(running.step).toBeGreaterThan(0);

    click("Pause");
    act(() => void vi.advanceTimersByTime(5_000));

    expect(readout()).toEqual(running);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("stops the animation of its own accord once the run is over", () => {
    vi.useFakeTimers();
    render(<GradientDescentDemo />);

    setSlider(/Learning rate/, 0.5);
    click("Start");
    act(() => void vi.advanceTimersByTime(5_000));

    expect(readout()).toMatchObject({ step: 1, x: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs without animating when the reader has asked for reduced motion", () => {
    stubReducedMotion(true);
    vi.useFakeTimers();
    render(<GradientDescentDemo />);

    click("Run to the end");

    // The whole run is applied at once: no timer, and nothing left to step.
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByText(/^Converged/)).toBeInTheDocument();
    expect(readout().step).toBeGreaterThan(1);
    // Stepping stays available without the animation (spec §14.1).
    click("Reset");
    click("Step");
    expect(readout().step).toBe(1);
  });

  it("announces where a run ended rather than interrupting at every step", () => {
    vi.useFakeTimers();
    const { container } = render(<GradientDescentDemo />);

    const live = container.querySelector("[aria-live]");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent(/^step 0,/);

    click("Start");
    act(() => void vi.advanceTimersByTime(1_000));
    expect(live).toHaveTextContent("Running.");

    click("Pause");
    expect(live).toHaveTextContent(/^step \d+, x = /);
  });
});
