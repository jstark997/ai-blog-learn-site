/**
 * Site-wide copy and identity, in one place: the specification asks for the
 * site's own words to be configurable rather than embedded throughout the
 * application (spec §8.1).
 *
 * Everything the homepage says about itself lives under `home`. Which posts
 * and lessons it shows is a different question and lives in
 * `lib/content/homepage.ts` — copy here, content selection there.
 *
 * PLACEHOLDER — the name and the copy below are scaffolding written by a
 * coding agent, not editorial copy (spec §3.1). The author replaces them
 * before the site is pointed at a public domain.
 */
export const site = {
  name: "AI Blog & Learn",
  description: "Exploring how artificial intelligence works and what it means.",
  blogDescription: "Ideas, observations and commentary on artificial intelligence.",
  learnDescription: "Structured explanations with interactive demonstrations.",
  author: "Jeff Stark",

  home: {
    /** The hero's positioning statement, beneath the short description. */
    positioning:
      "Two ways in: essays on what these systems mean, and lessons that take the mechanics apart piece by piece.",
    blogCta: "Read the blog",
    learnCta: "Start learning",

    recent: {
      heading: "Recent writing",
      linkLabel: "All posts",
    },

    featured: {
      heading: "Start here",
      description: "A few lessons worth reading first.",
      linkLabel: "All topics",
    },

    /** The Blog/Learn distinction, spelled out for a first-time visitor (spec §8.4). */
    introduction: {
      heading: "Two kinds of writing",
      blog: "The blog is for ideas, observations and commentary — what a result means, why an approach works, where the field seems to be going.",
      learn: "Learn is for explanation: lessons in reading order, with interactive demonstrations you can work through rather than only read about.",
    },
  },
} as const;
