/**
 * Human-readable dates, formatted once, the same way everywhere.
 *
 * Content dates are `YYYY-MM-DD` strings, normalised by the `isoDate`
 * preprocessor in `lib/content/schemas.ts`. They are calendar days with no
 * time and no time zone, so they are read back as UTC midnight: formatting
 * `2026-01-01` in a zone behind UTC would otherwise print 31 December.
 *
 * The locale is fixed rather than taken from the request. These pages are
 * statically generated, so there is no request to take it from, and a formatter
 * that depended on the build machine's ICU defaults would change the HTML
 * without anyone changing the content.
 */
const readable = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** `"2026-09-04"` → `"4 September 2026"`. */
export function formatDate(isoDate: string): string {
  return readable.format(new Date(`${isoDate}T00:00:00Z`));
}
