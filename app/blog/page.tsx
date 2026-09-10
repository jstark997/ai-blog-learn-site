import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { PlaceholderNote } from "@/components/content/PlaceholderNote";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: site.blogDescription,
};

export default function BlogIndexPage() {
  return (
    <Container width="prose" className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="text-lg text-muted text-pretty">{site.blogDescription}</p>
      <PlaceholderNote>
        The blog index lists published posts from <code className="font-mono">content/blog/</code>{" "}
        once the content pipeline (phase 3) and the blog routes (phase 6) exist.
      </PlaceholderNote>
    </Container>
  );
}
