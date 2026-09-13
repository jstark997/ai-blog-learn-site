import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonCard } from "@/components/lesson/LessonCard";
import { LessonList } from "@/components/lesson/LessonList";
import { PrerequisiteList } from "@/components/lesson/PrerequisiteList";
import type { Lesson } from "@/lib/content/learn";
import type { LessonMetadata } from "@/lib/content/schemas";

/**
 * The presentational half of the Learn UI. What a lesson listing shows is a
 * requirement (spec §11.1, §12), the `DRAFT` badge on a visible draft is
 * another (spec §16), and a route built from anything other than the two ids
 * would be a second source of truth for a lesson's URL (spec §11.1) — so all
 * three are asserted here rather than left to a human to notice.
 *
 * The routes themselves are checked end to end against a production build by
 * `scripts/verify.mjs`: status codes, and a draft lesson that must 404.
 */
function entry(
  overrides: Partial<LessonMetadata> = {},
  ids: { topicId?: string; lessonId?: string } = {},
): Pick<Lesson, "topicId" | "lessonId" | "metadata"> {
  return {
    topicId: ids.topicId ?? "neural-networks",
    lessonId: ids.lessonId ?? "gradient-descent",
    metadata: {
      title: "Gradient Descent",
      description: "The optimization loop underneath every trained network.",
      order: 30,
      difficulty: "intermediate",
      prerequisites: [],
      publishedAt: "2026-09-02",
      draft: false,
      ...overrides,
    },
  };
}

describe("LessonCard", () => {
  it("links the title to the route the two ids spell out", () => {
    render(<LessonCard lesson={entry()} />);

    expect(screen.getByRole("link", { name: "Gradient Descent" })).toHaveAttribute(
      "href",
      "/learn/neural-networks/gradient-descent",
    );
  });

  it("shows the description, the difficulty and the publication date", () => {
    render(<LessonCard lesson={entry()} />);

    expect(screen.getByText(/optimization loop/)).toBeInTheDocument();
    expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
    expect(screen.getByText("2 September 2026")).toHaveAttribute("datetime", "2026-09-02");
  });

  it("omits the difficulty and the updated date when the frontmatter has none", () => {
    render(<LessonCard lesson={entry({ difficulty: undefined })} />);

    expect(screen.queryByText(/Beginner|Intermediate|Advanced/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });

  it("shows an updated date when the frontmatter carries one", () => {
    render(<LessonCard lesson={entry({ updatedAt: "2026-10-12" })} />);

    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText("12 October 2026")).toHaveAttribute("datetime", "2026-10-12");
  });

  it("badges a draft, and leaves a published lesson unbadged", () => {
    const { unmount } = render(<LessonCard lesson={entry()} />);
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    unmount();

    render(<LessonCard lesson={entry({ draft: true })} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders the heading level the page asks for, so no rank is skipped", () => {
    const { unmount } = render(<LessonCard lesson={entry()} headingLevel="h2" />);
    expect(screen.getByRole("heading", { level: 2, name: "Gradient Descent" })).toBeInTheDocument();
    unmount();

    render(<LessonCard lesson={entry()} headingLevel="h3" />);
    expect(screen.getByRole("heading", { level: 3, name: "Gradient Descent" })).toBeInTheDocument();
  });
});

describe("LessonList", () => {
  it("keeps the order it is given, as an ordered list", () => {
    render(
      <LessonList
        lessons={[
          entry({ title: "Introduction", order: 10 }, { lessonId: "introduction" }),
          entry({ title: "Activation Functions", order: 20 }, { lessonId: "activation-functions" }),
          entry({ title: "Gradient Descent", order: 30 }, { lessonId: "gradient-descent" }),
        ]}
      />,
    );

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Introduction",
      "Activation Functions",
      "Gradient Descent",
    ]);
  });
});

describe("PrerequisiteList", () => {
  it("links a resolved prerequisite by the target lesson's own title", () => {
    render(
      <PrerequisiteList
        prerequisites={[
          { topicId: "neural-networks", lessonId: "introduction", title: "A Network Is a Function" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "A Network Is a Function" })).toHaveAttribute(
      "href",
      "/learn/neural-networks/introduction",
    );
  });

  it("names an unresolved prerequisite without linking to a page that would 404", () => {
    render(
      <PrerequisiteList
        prerequisites={[{ topicId: "neural-networks", lessonId: "backpropagation", title: null }]}
      />,
    );

    expect(screen.getByText("neural-networks/backpropagation")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
