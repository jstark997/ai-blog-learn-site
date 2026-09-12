import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PostCard } from "@/components/blog/PostCard";
import type { BlogPost } from "@/lib/content/blog";
import type { BlogPostMetadata } from "@/lib/content/schemas";
import { formatDate } from "@/lib/utils/date";

/**
 * The presentational half of the blog UI. What a listing entry shows is a
 * requirement (spec §9.1), and so is the `DRAFT` badge on a visible draft
 * (spec §16), so both are asserted here rather than left to a human to notice.
 *
 * The routes themselves are checked end to end against a production build by
 * `scripts/verify.mjs`: status codes, and a draft that must 404.
 */
function entry(overrides: Partial<BlogPostMetadata> = {}): Pick<BlogPost, "slug" | "metadata"> {
  return {
    slug: "why-agents-need-determinism",
    metadata: {
      title: "Why Agents Need Determinism",
      description: "Where deterministic logic belongs next to a probabilistic model.",
      publishedAt: "2026-09-04",
      tags: ["agents", "architecture"],
      draft: false,
      ...overrides,
    },
  };
}

describe("formatDate", () => {
  it("reads a content date as a calendar day, not a local instant", () => {
    // Behind UTC, a naive `new Date("2026-01-01")` formats as 31 December.
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
    expect(formatDate("2026-09-04")).toBe("4 September 2026");
    expect(formatDate("2026-12-31")).toBe("31 December 2026");
  });
});

describe("PostCard", () => {
  it("links the title to the post's route", () => {
    render(<PostCard post={entry()} />);

    expect(screen.getByRole("link", { name: "Why Agents Need Determinism" })).toHaveAttribute(
      "href",
      "/blog/why-agents-need-determinism",
    );
  });

  it("shows the description, the publication date and the tags", () => {
    render(<PostCard post={entry()} />);

    expect(screen.getByText(/deterministic logic belongs/)).toBeInTheDocument();
    expect(screen.getByText("4 September 2026")).toHaveAttribute("datetime", "2026-09-04");
    const tags = screen.getByRole("list", { name: "Tags" });
    expect(tags).toHaveTextContent("agents");
    expect(tags).toHaveTextContent("architecture");
  });

  it("shows an updated date only when the frontmatter carries one", () => {
    const { unmount } = render(<PostCard post={entry()} />);
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
    unmount();

    render(<PostCard post={entry({ updatedAt: "2026-10-12" })} />);
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText("12 October 2026")).toHaveAttribute("datetime", "2026-10-12");
  });

  it("badges a draft, and leaves a published post unbadged", () => {
    const { unmount } = render(<PostCard post={entry()} />);
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    unmount();

    render(<PostCard post={entry({ draft: true })} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders no tag list at all when there are no tags", () => {
    render(<PostCard post={entry({ tags: [] })} />);

    expect(screen.queryByRole("list", { name: "Tags" })).not.toBeInTheDocument();
  });
});
