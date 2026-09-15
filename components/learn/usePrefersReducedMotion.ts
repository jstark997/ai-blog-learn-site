"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the reader has asked their system to reduce motion.
 *
 * Demos animate — a gradient descent run steps once every few hundred
 * milliseconds — and spec §14.1 asks for the interaction to work without the
 * animation. The preference is read through `useSyncExternalStore` rather than
 * an effect that copies a media query into state: the store *is* the media
 * query, so there is no second copy to fall out of step, and a reader who
 * changes the setting mid-page sees the demo change with it.
 *
 * The server snapshot is `false`. Server-rendered HTML cannot know the
 * preference, and the honest default is the unreduced one, since a demo that
 * takes no step on its own is still fully operable by its buttons.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
