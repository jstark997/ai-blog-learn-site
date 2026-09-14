import { describe, expect, it } from "vitest";

import {
  formatNumber,
  linearScale,
  sample,
  ticks,
  toPathData,
  type Point,
} from "@/components/learn/plot/scale";

/**
 * The plotting arithmetic every demonstration in `components/learn` sits on
 * (spec §14.1). Two things are worth a test rather than an eye: that a value
 * lands where it should once the y axis has been flipped, and that a value
 * which cannot be drawn — `NaN`, `Infinity`, the divergence phase 12 goes
 * looking for — breaks the line instead of deleting it.
 */

describe("linearScale", () => {
  it("maps the ends of the domain to the ends of the range", () => {
    const x = linearScale([-6, 6], [36, 286]);

    expect(x(-6)).toBe(36);
    expect(x(6)).toBe(286);
    expect(x(0)).toBe(161);
  });

  it("inverts when the range does, which is how the y axis points upwards", () => {
    const y = linearScale([0, 1], [166, 14]);

    expect(y(0)).toBe(166);
    expect(y(1)).toBe(14);
    expect(y(0.5)).toBe(90);
  });

  it("extrapolates rather than clamping: clipping is the plot's decision", () => {
    expect(linearScale([0, 1], [0, 100])(2)).toBe(200);
  });

  it("survives a zero-width domain instead of returning NaN", () => {
    expect(linearScale([3, 3], [0, 100])(3)).toBe(0);
  });
});

describe("ticks", () => {
  it("chooses round numbers and includes zero when the domain crosses it", () => {
    expect(ticks([-6, 6], 6)).toEqual([-6, -4, -2, 0, 2, 4, 6]);
  });

  it("steps in fractions when the domain is small", () => {
    expect(ticks([-1.2, 1.2], 5)).toEqual([-1, -0.5, 0, 0.5, 1]);
  });

  it("does not leak float noise into a label", () => {
    for (const tick of ticks([0, 1], 3)) {
      expect(String(tick)).not.toMatch(/\d{5}/);
    }
  });

  it("has nothing to label on an empty domain", () => {
    expect(ticks([2, 2], 5)).toEqual([]);
  });
});

describe("sample", () => {
  it("takes count + 1 points, ends included", () => {
    const points = sample((x) => x * 2, [0, 1], 4);

    expect(points).toHaveLength(5);
    expect(points[0]).toEqual([0, 0]);
    expect(points[4]).toEqual([1, 2]);
  });

  it("keeps a value the function could not compute, for the path to break at", () => {
    expect(sample((x) => 1 / x, [-1, 1], 2)[1]).toEqual([0, Infinity]);
  });
});

describe("toPathData", () => {
  const identity = (value: number) => value;

  it("moves to the first point and lines to the rest", () => {
    expect(toPathData([[0, 0], [1, 2]], identity, identity)).toBe("M0 0 L1 2");
  });

  it("starts a new subpath after a gap rather than dropping the whole line", () => {
    const points: Point[] = [
      [0, 0],
      [1, Number.NaN],
      [2, Number.POSITIVE_INFINITY],
      [3, 3],
      [4, 4],
    ];

    // One invalid number anywhere in a `d` attribute makes a browser discard
    // the entire path, so a diverging series must not contribute a coordinate.
    const path = toPathData(points, identity, identity);

    expect(path).toBe("M0 0 M3 3 L4 4");
    expect(path).not.toMatch(/NaN|Infinity/);
  });

  it("has no path at all when nothing is drawable", () => {
    expect(toPathData([[0, Number.NaN]], identity, identity)).toBe("");
  });
});

describe("formatNumber", () => {
  it("drops the trailing zeros an axis does not need", () => {
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(0.5)).toBe("0.5");
    expect(formatNumber(0.6791787)).toBe("0.68");
  });

  it("prints negative zero as zero", () => {
    expect(formatNumber(-0)).toBe("0");
    expect(formatNumber(-0.001)).toBe("0");
  });

  it("names the values a readout must never show as NaN", () => {
    expect(formatNumber(Number.NaN)).toBe("undefined");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("∞");
    expect(formatNumber(Number.NEGATIVE_INFINITY)).toBe("−∞");
  });
});
