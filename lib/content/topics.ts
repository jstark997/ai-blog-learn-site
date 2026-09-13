/**
 * Topic presentation data — the display title, position and blurb for each
 * topic under `content/learn/` (spec §11.1, §36).
 *
 * This file is *presentation only*. A topic's identity is its directory name;
 * nothing here creates a topic, and no lesson carries a `topic` field. Adding
 * an entry with no matching directory, or a directory with no entry here, is a
 * `validate:content` error rather than a silent second group on the Learn
 * index — which is what a display name stored in three places eventually
 * produces.
 *
 * Entries are authored in display order, and `order` is the number the Learn
 * index sorts on. Topics arrive as the author writes them: a third topic is a
 * new directory plus three lines here, with no code change anywhere.
 *
 * This module is imported by `scripts/validate-content.mjs` through Node's
 * TypeScript stripping, so it must stay free of path aliases, JSX and
 * non-erasable syntax.
 */

export type LearningTopic = {
  /** The directory name under `content/learn/`, and the URL segment. */
  id: string;
  title: string;
  /** Ascending; the Learn index orders topics by it. */
  order: number;
  description?: string;
};

export const learningTopics: readonly LearningTopic[] = [
  {
    id: "neural-networks",
    title: "Neural Networks",
    order: 1,
    description:
      "How a network represents a function, and how it learns one: activations, gradients and the training loop.",
  },
  {
    id: "transformers",
    title: "Transformers",
    order: 2,
    description:
      "The architecture behind modern language models, from token embeddings to attention.",
  },
];

/** One topic's presentation data, or `undefined` for an id nothing declares. */
export function getTopic(id: string): LearningTopic | undefined {
  return learningTopics.find((topic) => topic.id === id);
}

/**
 * Where a topic sorts among the others. An undeclared topic sorts last instead
 * of throwing: `validate:content` already fails on one, and a lesson listing
 * should still render in `pnpm dev` while the author is mid-rename.
 */
export function topicRank(id: string): number {
  return getTopic(id)?.order ?? Number.MAX_SAFE_INTEGER;
}
