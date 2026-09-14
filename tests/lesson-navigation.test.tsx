import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LessonPager, type PagerEntry } from "@/components/navigation/LessonPager";
import { TopicLessonNav, type TopicNavEntry } from "@/components/navigation/TopicLessonNav";
import type { LessonMetadata } from "@/lib/content/schemas";

/**
 * Lesson navigation (spec §13, §23). Three things are requirements rather than
 * taste, so they are asserted here: adjacency is absent at a topic boundary
 * instead of wrapping around, the current lesson is identifiable to assistive
 * technology and not only by colour, and the small-screen list is a keyboard-
 * operable disclosure.
 *
 * Which lesson is "next" is `getAdjacentLessons`' answer, tested against real
 * content in `tests/learn.test.ts`; these components only render what it says.
 */
function metadata(overrides: Partial<LessonMetadata> = {}): LessonMetadata {
  return {
    title: "Gradient Descent",
    description: "The optimization loop underneath every trained network.",
    order: 30,
    difficulty: "intermediate",
    prerequisites: [],
    publishedAt: "2026-09-02",
    draft: false,
    ...overrides,
  };
}

function entry(lessonId: string, title: string, draft = false): PagerEntry & TopicNavEntry {
  return { topicId: "neural-networks", lessonId, metadata: metadata({ title, draft }) };
}

const lessons = [
  entry("introduction", "What a Neural Network Is"),
  entry("activation-functions", "Activation Functions"),
  entry("gradient-descent", "Gradient Descent"),
];

describe("LessonPager", () => {
  it("links both neighbours, naming the direction as well as the lesson", () => {
    render(<LessonPager previous={lessons[0]} next={lessons[2]} />);

    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute(
      "href",
      "/learn/neural-networks/introduction",
    );
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/learn/neural-networks/gradient-descent",
    );
  });

  it("names the lesson it leads to, not just the direction", () => {
    render(<LessonPager previous={lessons[0]} next={null} />);

    expect(screen.getByRole("link", { name: /What a Neural Network Is/ })).toBeInTheDocument();
  });

  it("carries rel=prev and rel=next", () => {
    render(<LessonPager previous={lessons[0]} next={lessons[2]} />);

    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute("rel", "prev");
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("rel", "next");
  });

  it("omits the side a topic boundary has nothing on", () => {
    const { unmount } = render(<LessonPager previous={null} next={lessons[1]} />);
    expect(screen.queryByRole("link", { name: /Previous/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Next/ })).toBeInTheDocument();
    unmount();

    render(<LessonPager previous={lessons[1]} next={null} />);
    expect(screen.getByRole("link", { name: /Previous/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Next/ })).not.toBeInTheDocument();
  });

  it("renders nothing at all for a topic of one lesson", () => {
    const { container } = render(<LessonPager previous={null} next={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

function renderNav(currentLessonId = "activation-functions") {
  return render(
    <TopicLessonNav
      topicId="neural-networks"
      topicTitle="Neural Networks"
      lessons={lessons}
      currentLessonId={currentLessonId}
    />,
  );
}

describe("TopicLessonNav", () => {
  it("lists every lesson of the topic, in the order it was given them", () => {
    renderNav();

    const items = within(screen.getByRole("list")).getAllByRole("link");
    expect(items.map((item) => item.textContent)).toEqual([
      "1What a Neural Network Is",
      "2Activation Functions",
      "3Gradient Descent",
    ]);
    expect(items[1]).toHaveAttribute("href", "/learn/neural-networks/activation-functions");
  });

  it("marks the current lesson, and only it, with aria-current", () => {
    renderNav("gradient-descent");

    expect(screen.getByRole("link", { name: "Gradient Descent" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Activation Functions" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("links back to the topic overview", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "Back to Neural Networks" })).toHaveAttribute(
      "href",
      "/learn/neural-networks",
    );
  });

  it("marks a draft that is visible in development", () => {
    render(
      <TopicLessonNav
        topicId="neural-networks"
        topicTitle="Neural Networks"
        lessons={[...lessons, entry("backpropagation", "Backpropagation", true)]}
        currentLessonId="introduction"
      />,
    );

    expect(screen.getByRole("link", { name: /Backpropagation Draft/ })).toBeInTheDocument();
  });

  /**
   * The panel is hidden by `display: none` from a utility class rather than by
   * the `hidden` attribute, because above `lg` it must be open whatever the
   * button reports — so jsdom, which applies no stylesheet, cannot be asked
   * whether the links are reachable. What is asserted is the contract the
   * breakpoint is hung on: the state the button publishes, the class that
   * decides the display, and the keyboard.
   */
  it("starts collapsed on a narrow viewport, and opens from the keyboard", async () => {
    const user = userEvent.setup();
    renderNav();

    const toggle = screen.getByRole("button", { name: "Lessons" });
    const panel = screen.getByRole("list");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveClass("hidden");
    expect(panel).toHaveClass("lg:flex");

    await user.tab();
    await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveClass("hidden");
  });

  it("closes on Escape and returns focus to the button", async () => {
    const user = userEvent.setup();
    renderNav();

    const toggle = screen.getByRole("button", { name: "Lessons" });
    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "Gradient Descent" }));

    // A client-side navigation leaves the panel mounted, so choosing a lesson
    // has to close it; Escape has to work from anywhere inside the panel.
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
});
