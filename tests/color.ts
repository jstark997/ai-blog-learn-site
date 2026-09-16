/**
 * Enough colour science to check the theme against WCAG, and the parser that
 * reads the theme out of `app/globals.css`.
 *
 * The tokens are read from the stylesheet rather than restated here, so the
 * contrast test measures the colours the site actually ships: editing a token
 * to something unreadable fails the suite instead of passing it unnoticed.
 *
 * Every token is declared once, as `light-dark(oklch(…), oklch(…))` — the theme
 * strategy in `app/globals.css` — so one regular expression covers the file.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export type Scheme = "light" | "dark";

/** Both halves of one `light-dark()` token, as sRGB in 0–1. */
export type ThemeColor = Record<Scheme, Rgb>;

type Rgb = readonly [number, number, number];

const TOKEN_PATTERN =
  /--color-([a-z-]+):\s*light-dark\(\s*oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\),\s*oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)\s*\)/g;

/** The `@theme` colour tokens of `app/globals.css`, keyed by name without the prefix. */
export function readThemeColors(): Record<string, ThemeColor> {
  const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
  const colors: Record<string, ThemeColor> = {};

  for (const match of css.matchAll(TOKEN_PATTERN)) {
    const [, name, lightL, lightC, lightH, darkL, darkC, darkH] = match;
    colors[name] = {
      light: oklchToRgb(Number(lightL) / 100, Number(lightC), Number(lightH)),
      dark: oklchToRgb(Number(darkL) / 100, Number(darkC), Number(darkH)),
    };
  }

  return colors;
}

/**
 * Oklch to sRGB, clipped to the gamut: Oklab's inverse matrices, then the sRGB
 * transfer function. Clipping is what a browser does with an out-of-gamut
 * colour too, so a token that leaves sRGB is measured as what appears on screen.
 */
export function oklchToRgb(lightness: number, chroma: number, hueDegrees: number): Rgb {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return linear.map(gammaEncode) as unknown as Rgb;
}

function gammaEncode(value: number): number {
  const encoded = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, encoded));
}

/** WCAG 2.x relative luminance. */
function relativeLuminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG 2.x contrast ratio, between 1 and 21, whichever colour is lighter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
