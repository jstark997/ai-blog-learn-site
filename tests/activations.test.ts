// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  activationList,
  activations,
  INPUT_DOMAIN,
  type Activation,
} from "@/components/learn/neural-networks/activations";

/**
 * The arithmetic behind the activation function explorer (spec §38.2), on its
 * own — the counterpart of "the descent loop" in
 * `tests/gradient-descent-demo.test.tsx`.
 *
 * `tests/activation-explorer.test.tsx` asserts that the component reports
 * whatever these functions return; this file asserts that what they return is
 * the mathematics they are named after. Both halves are needed: a sigmoid that
 * had lost its `1 +` would still be reported faithfully by a component test.
 *
 * The declared plot windows are checked here too, because they are arithmetic
 * about the functions rather than about the drawing: a window that does not
 * contain its own curve clips it, and no component test would notice, since the
 * component draws exactly what it is told.
 */

/** The input domain, sampled finely enough to catch a curve leaving its window. */
function inputs(count = 601): number[] {
  const [start, end] = INPUT_DOMAIN;
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1));
}

function outputs(activation: Activation): number[] {
  return inputs().map(activation.fn);
}

describe("the activation functions", () => {
  it("clamps ReLU at zero and leaves the positive half alone", () => {
    expect(activations.relu.fn(-6)).toBe(0);
    expect(activations.relu.fn(-0.001)).toBe(0);
    expect(activations.relu.fn(0)).toBe(0);
    expect(activations.relu.fn(0.001)).toBeCloseTo(0.001);
    expect(activations.relu.fn(6)).toBe(6);
  });

  it("gives sigmoid its half at zero, its asymptotes and its symmetry", () => {
    expect(activations.sigmoid.fn(0)).toBe(0.5);
    expect(activations.sigmoid.fn(-6)).toBeCloseTo(0.00247, 5);
    expect(activations.sigmoid.fn(6)).toBeCloseTo(0.99753, 5);

    // σ(−z) = 1 − σ(z). A dropped minus sign in the exponent still produces a
    // curve of the right shape, but reflected; this is what catches it.
    for (const z of [0.25, 1, 3, 5.5]) {
      expect(activations.sigmoid.fn(-z)).toBeCloseTo(1 - activations.sigmoid.fn(z), 12);
    }
  });

  it("gives tanh its zero at zero, its asymptotes and its odd symmetry", () => {
    expect(activations.tanh.fn(0)).toBe(0);
    expect(activations.tanh.fn(-6)).toBeCloseTo(-0.99999, 5);
    expect(activations.tanh.fn(6)).toBeCloseTo(0.99999, 5);

    for (const z of [0.25, 1, 3, 5.5]) {
      expect(activations.tanh.fn(-z)).toBeCloseTo(-activations.tanh.fn(z), 12);
    }
  });

  it("rises monotonically, which is the property the explorer demonstrates", () => {
    for (const activation of activationList) {
      const values = outputs(activation);

      for (let index = 1; index < values.length; index += 1) {
        expect(values[index]).toBeGreaterThanOrEqual(values[index - 1]);
      }
    }
  });

  // The slider moves across the whole of `INPUT_DOMAIN`, and the readout shows
  // the result as a number. One `NaN` anywhere in here would reach the page.
  it("returns a finite number for every input the slider can reach", () => {
    for (const activation of activationList) {
      expect(outputs(activation).every(Number.isFinite)).toBe(true);
    }
  });

  it("puts the interesting part of every curve within reach of the slider", () => {
    const [start, end] = INPUT_DOMAIN;

    // Every one of the three turns over at zero: ReLU kinks there, and the
    // other two cross the middle of their range. A domain that excluded it
    // would plot three curves with nothing to see.
    expect(start).toBeLessThan(0);
    expect(end).toBeGreaterThan(0);
  });
});

describe("the plot window each function declares", () => {
  it("contains the whole of its own curve, so nothing is drawn outside it", () => {
    for (const activation of activationList) {
      const values = outputs(activation);
      const [low, high] = activation.range;

      expect(Math.min(...values)).toBeGreaterThanOrEqual(low);
      expect(Math.max(...values)).toBeLessThanOrEqual(high);
    }
  });

  it("is close enough around the curve that the curve is not a flat line", () => {
    for (const activation of activationList) {
      const values = outputs(activation);
      const [low, high] = activation.range;
      const used = (Math.max(...values) - Math.min(...values)) / (high - low);

      // Two thirds of the window: the reason each function declares a window of
      // its own rather than sharing one is that tanh in ReLU's window would be
      // a horizontal line.
      expect(used).toBeGreaterThan(2 / 3);
    }
  });
});

describe("the selector's list", () => {
  it("offers each function once, in a fixed order, keyed by its own id", () => {
    expect(activationList.map((activation) => activation.id)).toEqual([
      "relu",
      "sigmoid",
      "tanh",
    ]);

    for (const [id, activation] of Object.entries(activations)) {
      expect(activation.id).toBe(id);
      expect(activationList).toContain(activation);
    }
  });

  it("writes every equation with a true minus, which a line break may not follow", () => {
    for (const activation of activationList) {
      expect(activation.equation).not.toContain("-");
      expect(activation.name.length).toBeGreaterThan(0);
    }
  });
});
