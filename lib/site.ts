/**
 * Site-wide copy and identity, in one place: the specification asks for the
 * site's own words to be configurable rather than embedded throughout the
 * application (spec §8.1).
 *
 * PLACEHOLDER — the name and the descriptions below are scaffolding written by
 * a coding agent, not editorial copy (spec §3.1). The author replaces them
 * before the site is pointed at a public domain.
 */
export const site = {
  name: "AI Blog & Learn",
  description: "Exploring how artificial intelligence works and what it means.",
  blogDescription: "Ideas, observations and commentary on artificial intelligence.",
  learnDescription: "Structured explanations with interactive demonstrations.",
  author: "Jeff Stark",
} as const;
