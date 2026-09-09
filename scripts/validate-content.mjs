#!/usr/bin/env node
// Eagerly validates every file under content/: frontmatter against the Zod
// schemas, plus the cross-file checks (topic directory <-> topics.ts parity,
// order uniqueness within a topic, prerequisite resolution, blog slug
// uniqueness). Exits non-zero on failure. Runs as `prebuild` and in CI.
//
// STUB until phase 4 (development plan §9), which implements it against
// lib/content/schemas.ts. There is no content/ directory yet, so there is
// nothing to validate; exit 0 so the build gate is real from phase 1 onward.

console.log("validate:content: stub — implemented in phase 4; nothing to validate yet");
