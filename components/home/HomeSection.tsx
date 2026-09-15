import Link from "next/link";

/** The link that ends a section: the full index the section samples from. */
type SectionAction = {
  href: string;
  label: string;
};

/**
 * One labelled band of the homepage: a heading, an optional line beneath it,
 * the content, and a link to the index the section is a sample of.
 *
 * The heading is an `<h2>` wired to the section with `aria-labelledby`, so the
 * page reads as a handful of named regions rather than one undifferentiated
 * column, and the cards inside can sit at `<h3>`.
 *
 * The action link follows the content rather than sharing the heading row: it
 * is what a reader wants *after* looking at the sample, and it stays in the
 * same place at every width.
 */
export function HomeSection({
  id,
  heading,
  description,
  action,
  children,
}: {
  id: string;
  heading: string;
  description?: string;
  action?: SectionAction;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-balance">
          {heading}
        </h2>
        {description !== undefined && <p className="text-muted text-pretty">{description}</p>}
      </div>

      {children}

      {action !== undefined && (
        <Link
          href={action.href}
          className="w-fit text-sm font-medium text-accent transition-opacity hover:opacity-80"
        >
          {action.label} <span aria-hidden>&rarr;</span>
        </Link>
      )}
    </section>
  );
}
