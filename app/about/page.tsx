import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { PlaceholderNote } from "@/components/content/PlaceholderNote";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name}.`,
};

export default function AboutPage() {
  return (
    <Container width="prose" className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">About</h1>
      <p className="text-lg text-muted text-pretty">
        Who made this site, why it exists, and how the Blog and the Learn sections differ.
      </p>
      <PlaceholderNote>
        The about page is written in phase 14. Its prose is the author&rsquo;s, not an
        agent&rsquo;s.
      </PlaceholderNote>
    </Container>
  );
}
