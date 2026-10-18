import type { SavedDay } from "./types";

export function roundScore(raw: number) {
  return Math.round(Math.max(0, raw));
}

/** Older snapshots may have a capped score; keep the saved forecast intact. */
export function displayedScore(day: Pick<SavedDay, "score" | "raw">) {
  return day.score === null ? null : roundScore(day.raw ?? day.score);
}
