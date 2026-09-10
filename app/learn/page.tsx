import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { PlaceholderNote } from "@/components/content/PlaceholderNote";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Learn",
  description: site.learnDescription,
};

export default function LearnIndexPage() {
  return (
    <Container width="prose" className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Learn</h1>
      <p className="text-lg text-muted text-pretty">{site.learnDescription}</p>
      <PlaceholderNote>
        The learn index groups lessons by topic once the learn content utilities (phase 7) and the
        learn routes (phase 8) exist.
      </PlaceholderNote>
    </Container>
  );
}
