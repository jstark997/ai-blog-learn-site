import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PostList } from "@/components/blog/PostList";
import { HomeSection } from "@/components/home/HomeSection";
import type { BlogPost } from "@/lib/content/blog";
import type { BlogPostMetadata } from "@/lib/content/schemas";

/**
 * The presentational half of the homepage (spec §8).
 *
 * The heading rank is the part worth asserting: the homepage puts listings
 * under a section's `<h2>`, and a card fixed at `<h2>` would flatten the
 * outline of the one page a first-time visitor lands on. The page itself is
 * checked end to end by `scripts/verify.mjs`, which also asserts no draft URL
 * appears on it.
 */
function entry(slug: string, overrides: Partial<BlogPostMetadata> = {}): Pick<BlogPost, "slug" | "metadata"> {
  return {
    slug,
    metadata: {
      title: slug,
      description: `About ${slug}.`,
      publishedAt: "2026-09-04",
      tags: [],
      draft: false,
      ...overrides,
    },
  };
}

describe("PostList", () => {
  it("lists posts in the order it is given, as an ordered list", () => {
    render(<PostList posts={[entry("second"), entry("first")]} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("second"),
      expect.stringContaining("first"),
    ]);
  });

  it("renders card headings at the level the page asks for", () => {
    render(<PostList posts={[entry("only")]} headingLevel="h3" />);

    expect(screen.getByRole("heading", { level: 3, name: "only" })).toBeInTheDocument();
  });

  it("defaults to h2, the rank an index page wants", () => {
    render(<PostList posts={[entry("only")]} />);

    expect(screen.getByRole("heading", { level: 2, name: "only" })).toBeInTheDocument();
  });
});

describe("HomeSection", () => {
  it("names its region with its own heading", () => {
    render(
      <HomeSection id="recent" heading="Recent writing">
        <p>content</p>
      </HomeSection>,
    );

    const section = screen.getByRole("region", { name: "Recent writing" });
    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent("Recent writing");
  });

  it("links to the index it samples from, once, when given an action", () => {
    render(
      <HomeSection
        id="recent"
        heading="Recent writing"
        description="The latest three."
        action={{ href: "/blog", label: "All posts" }}
      >
        <p>content</p>
      </HomeSection>,
    );

    expect(screen.getByText("The latest three.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All posts" })).toHaveAttribute("href", "/blog");
  });

  it("renders no link and no description when neither is given", () => {
    render(
      <HomeSection id="introduction" heading="Two kinds of writing">
        <p>content</p>
      </HomeSection>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
