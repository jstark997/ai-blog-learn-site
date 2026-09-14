import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ActivationFunctionExplorer } from "@/components/learn/neural-networks/ActivationFunctionExplorer";
import { activations, INPUT_DOMAIN } from "@/components/learn/neural-networks/activations";
import { PLOT_AREA } from "@/components/learn/plot/Plot";
import { linearScale } from "@/components/learn/plot/scale";

/**
 * The first educational demonstration (spec §38.2). Three things are asserted
 * here because a human cannot check them by looking once: that the output
 * follows the chosen function, that it follows the slider, and that the marker
 * drawn on the curve is the same state the live summary reports — the
 * requirement in spec §14.1 that the text convey the point without the picture
 * is worth nothing if the two can drift apart.
 *
 * Keyboard operation is covered by *what* the controls are rather than by
 * driving them: a native radio group and a native `<input type="range">` bring
 * arrow-key handling from the browser, and jsdom implements neither, so a test
 * that pressed an arrow key here would prove only that jsdom does nothing.
 */

/** The live summary, e.g. `ReLU, input 0.75, output 0.75`. */
function summary(): { name: string; input: number; output: number } {
  const text = screen.getByText(/, input /).textContent ?? "";
  const match = /^(\S+), input (-?[\d.]+), output (-?[\d.]+)$/.exec(text);

  if (match === null) throw new Error(`the summary does not read as expected: "${text}"`);

  return { name: match[1], input: Number(match[2]), output: Number(match[3]) };
}

function setInput(value: number): void {
  fireEvent.change(screen.getByRole("slider"), { target: { value: String(value) } });
}

describe("ActivationFunctionExplorer", () => {
  it("names itself, so a reader can jump to it", () => {
    render(<ActivationFunctionExplorer />);

    expect(screen.getByRole("region", { name: "Activation function explorer" })).toBeInTheDocument();
  });

  it("opens on ReLU, showing its equation and a matching summary", () => {
    render(<ActivationFunctionExplorer />);

    expect(screen.getByRole("radio", { name: "ReLU" })).toBeChecked();
    expect(screen.getByText("ReLU(z) = max(0, z)")).toBeInTheDocument();
    expect(summary()).toEqual({ name: "ReLU", input: 0.75, output: 0.75 });
  });

  it("offers the three functions as one radio group", () => {
    render(<ActivationFunctionExplorer />);

    const selector = screen.getByRole("group", { name: "Function" });
    const names = within(selector)
      .getAllByRole("radio")
      .map((radio) => radio.getAttribute("value"));

    expect(names).toEqual(["relu", "sigmoid", "tanh"]);
  });

  it("computes a different output when the function changes, from the same input", async () => {
    const user = userEvent.setup();
    render(<ActivationFunctionExplorer />);

    await user.click(screen.getByRole("radio", { name: "Sigmoid" }));

    expect(screen.getByText("sigmoid(z) = 1 / (1 + exp(−z))")).toBeInTheDocument();
    // sigmoid(0.75) = 0.679…
    expect(summary()).toEqual({ name: "Sigmoid", input: 0.75, output: 0.68 });

    await user.click(screen.getByRole("radio", { name: "Tanh" }));

    // tanh(0.75) = 0.635…
    expect(summary()).toEqual({ name: "Tanh", input: 0.75, output: 0.64 });
  });

  it("reports the new output when the slider moves", () => {
    render(<ActivationFunctionExplorer />);

    setInput(3.5);
    expect(summary()).toMatchObject({ input: 3.5, output: 3.5 });

    // The half of ReLU that a plot makes obvious and a formula does not.
    setInput(-2);
    expect(summary()).toMatchObject({ input: -2, output: 0 });
  });

  it("keeps the input when the function changes, which is what makes them comparable", async () => {
    const user = userEvent.setup();
    render(<ActivationFunctionExplorer />);

    setInput(-2);
    await user.click(screen.getByRole("radio", { name: "Tanh" }));

    expect(summary()).toEqual({ name: "Tanh", input: -2, output: -0.96 });
  });

  it("marks the point the summary describes, on the curve the summary names", () => {
    const { container } = render(<ActivationFunctionExplorer />);

    setInput(-1.5);

    const reported = summary();
    const marker = container.querySelector("circle");
    const { range } = activations.relu;

    expect(marker).not.toBeNull();
    expect(Number(marker?.getAttribute("cx"))).toBeCloseTo(
      linearScale(INPUT_DOMAIN, [PLOT_AREA.left, PLOT_AREA.right])(reported.input),
    );
    expect(Number(marker?.getAttribute("cy"))).toBeCloseTo(
      linearScale(range, [PLOT_AREA.bottom, PLOT_AREA.top])(reported.output),
    );
  });

  it("reframes the plot for each function rather than squashing every curve into one window", async () => {
    const user = userEvent.setup();
    render(<ActivationFunctionExplorer />);

    // ReLU is unbounded above and reaches 6 over this input range; tanh never
    // leaves [-1, 1]. One shared vertical window would flatten tanh to a line.
    expect(screen.getByRole("img", { name: /^ReLU plotted/ })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Tanh" }));

    expect(screen.getByRole("img", { name: /^Tanh plotted/ })).toBeInTheDocument();
  });

  it("announces the summary politely rather than interrupting", () => {
    render(<ActivationFunctionExplorer />);

    expect(screen.getByText(/, input /)).toHaveAttribute("aria-live", "polite");
  });

  it("labels the slider and lets it reach both ends of the plotted range", () => {
    render(<ActivationFunctionExplorer />);

    const slider = screen.getByRole("slider", { name: "Input z" });

    expect(slider).toHaveAttribute("min", String(INPUT_DOMAIN[0]));
    expect(slider).toHaveAttribute("max", String(INPUT_DOMAIN[1]));
  });

  it("puts the function selector and the slider in the tab order", async () => {
    const user = userEvent.setup();
    render(<ActivationFunctionExplorer />);

    // A radio group is one tab stop, at the checked option; the arrow keys move
    // within it. So two tabs should reach the slider.
    await user.tab();
    expect(screen.getByRole("radio", { name: "ReLU" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("slider")).toHaveFocus();
  });
});
