import type { Interval } from "@/components/learn/plot/scale";

/**
 * The three activation functions the explorer compares (spec §38.2), kept apart
 * from the component that draws them so the arithmetic is testable on its own
 * and a fourth function is one entry rather than a change to the UI.
 */

export type ActivationId = "relu" | "sigmoid" | "tanh";

export type Activation = {
  id: ActivationId;
  /** Shown on the selector, and named first in the live summary. */
  name: string;
  /**
   * The definition, as plain text rather than typeset mathematics.
   *
   * KaTeX runs in the MDX pipeline at build time (spec §20) and is not shipped
   * to the browser; a demo that typeset its own equation would have to load the
   * whole formula renderer as client JavaScript to show one line, against spec
   * §30. `exp(-z)` also survives being read aloud, which a superscript does not.
   *
   * The sign is a true minus (U+2212), not a hyphen: it is the correct
   * character for mathematics, and a browser offers a line break after a hyphen
   * but not after a minus, which is what stops `exp(-z)` splitting across two
   * lines at 375 px.
   */
  equation: string;
  /** The vertical window the plot frames this function in over `INPUT_DOMAIN`. */
  range: Interval;
  fn: (z: number) => number;
};

/** The inputs the explorer plots and the slider moves through. */
export const INPUT_DOMAIN: Interval = [-6, 6];

export const activations = {
  relu: {
    id: "relu",
    name: "ReLU",
    equation: "ReLU(z) = max(0, z)",
    // ReLU is unbounded above: over [-6, 6] it reaches 6, so the window has to.
    range: [-1, 6],
    fn: (z) => Math.max(0, z),
  },
  sigmoid: {
    id: "sigmoid",
    name: "Sigmoid",
    equation: "sigmoid(z) = 1 / (1 + exp(−z))",
    range: [-0.2, 1.2],
    fn: (z) => 1 / (1 + Math.exp(-z)),
  },
  tanh: {
    id: "tanh",
    name: "Tanh",
    equation: "tanh(z) = (exp(z) − exp(−z)) / (exp(z) + exp(−z))",
    range: [-1.2, 1.2],
    fn: Math.tanh,
  },
} satisfies Record<ActivationId, Activation>;

/** The selector's order, fixed here rather than left to object key order. */
export const activationList: readonly Activation[] = [
  activations.relu,
  activations.sigmoid,
  activations.tanh,
];
