/**
 * Colour contrast, in both themes (spec §28; phase 18).
 *
 * "Adequate text contrast" is the one accessibility criterion in the
 * specification that a text-only agent can actually settle rather than
 * self-certify, so it is settled here: the tokens are read out of
 * `app/globals.css` and measured, and a token edited to something unreadable
 * fails this file.
 *
 * The thresholds are WCAG 2.2 AA:
 *
 * - 4.5:1 for body text (1.4.3). Everything on this site is body-sized or
 *   smaller — the largest text is a 40px heading in `ink`, which passes the
 *   stricter threshold anyway, so the large-text exemption is never claimed.
 * - 3:1 for the boundary of a control and for a focus indicator (1.4.11).
 *
 * `rule` is deliberately absent from the 3:1 list. It separates — a divider
 * between cards, the line under the header, a table's cell borders — and a
 * separator is decorative under 1.4.11. `control` is the token that outlines
 * something you can operate, and it is held to the threshold.
 */
import { describe, expect, it } from "vitest";

import { contrastRatio, readThemeColors, type Scheme } from "./color";

const colors = readThemeColors();
const schemes: readonly Scheme[] = ["light", "dark"];

/** Text foreground → every background it is placed on, and the ratio required. */
const textPairs = [
  { foreground: "ink", backgrounds: ["canvas", "surface", "accent-soft", "warning-soft"] },
  { foreground: "muted", backgrounds: ["canvas", "surface"] },
  { foreground: "accent", backgrounds: ["canvas", "surface", "accent-soft"] },
  { foreground: "on-accent", backgrounds: ["accent"] },
  { foreground: "warning", backgrounds: ["canvas", "warning-soft"] },
] as const;

/** Non-text: a control's boundary, and the focus ring drawn just outside it. */
const nonTextPairs = [
  { foreground: "control", backgrounds: ["canvas", "surface", "accent-soft"] },
  { foreground: "accent", backgrounds: ["canvas", "surface"] },
] as const;

const TEXT_MINIMUM = 4.5;
const NON_TEXT_MINIMUM = 3;

function ratio(foreground: string, background: string, scheme: Scheme): number {
  const a = colors[foreground];
  const b = colors[background];
  expect(a, `--color-${foreground} is missing from app/globals.css`).toBeDefined();
  expect(b, `--color-${background} is missing from app/globals.css`).toBeDefined();

  return contrastRatio(a[scheme], b[scheme]);
}

describe("theme contrast", () => {
  it("reads every colour token from the stylesheet", () => {
    // If the `light-dark()` shape ever changes, the parser goes quiet rather
    // than wrong; this is the assertion that notices.
    expect(Object.keys(colors).toSorted()).toEqual([
      "accent",
      "accent-soft",
      "canvas",
      "control",
      "ink",
      "muted",
      "on-accent",
      "rule",
      "surface",
      "warning",
      "warning-soft",
    ]);
  });

  for (const scheme of schemes) {
    describe(scheme, () => {
      for (const { foreground, backgrounds } of textPairs) {
        for (const background of backgrounds) {
          it(`${foreground} on ${background} meets AA for text`, () => {
            expect(ratio(foreground, background, scheme)).toBeGreaterThanOrEqual(TEXT_MINIMUM);
          });
        }
      }

      for (const { foreground, backgrounds } of nonTextPairs) {
        for (const background of backgrounds) {
          it(`${foreground} on ${background} meets AA for non-text`, () => {
            expect(ratio(foreground, background, scheme)).toBeGreaterThanOrEqual(
              NON_TEXT_MINIMUM,
            );
          });
        }
      }
    });
  }
});
