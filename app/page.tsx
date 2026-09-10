import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PlaceholderNote } from "@/components/content/PlaceholderNote";
import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <Container className="flex flex-col gap-10">
      <div className="flex max-w-measure flex-col gap-5">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">{site.name}</h1>
        <p className="text-lg text-muted text-pretty">{site.description}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
          >
            Read the blog
          </Link>
          <Link
            href="/learn"
            className="rounded-md border border-rule px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            Start learning
          </Link>
        </div>
      </div>
      <PlaceholderNote>
        The homepage — hero copy, recent posts and featured lessons — is built in phase 13.
      </PlaceholderNote>
    </Container>
  );
}
