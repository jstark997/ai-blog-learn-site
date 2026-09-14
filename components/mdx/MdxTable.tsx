/**
 * The `table` override (spec §15), completing the note left in
 * `app/globals.css`: a table wide enough to overflow the reading column scrolls
 * inside its own box instead of widening the page.
 *
 * The wrapper carries the scrolling, so the `<table>` keeps its own element and
 * its table semantics — `display: block` on the table would have scrolled too,
 * at the cost of the role some screen readers read it by.
 *
 * `tabIndex={0}` with a named `region` is the established way to make a
 * scrollable box reachable without a pointer; the cost is a tab stop on a table
 * narrow enough not to scroll, which only JavaScript could avoid, and which is
 * a smaller problem than content no keyboard can reach.
 */
export function MdxTable(props: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div role="region" aria-label="Table" tabIndex={0} className="overflow-x-auto">
      <table {...props} />
    </div>
  );
}
