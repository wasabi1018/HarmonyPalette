"use client";

import { useEffect } from "react";
import {
  type DailyVisitorState,
  getOrCreateDailyVisitorState,
  japanCalendarDate,
  markDailyVisitorRecorded,
} from "@/lib/analytics/daily-visitor";
import { recordDailyUniqueVisitor } from "@/lib/site-analytics";

export function DailyUniqueVisitorTracker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    let state: DailyVisitorState;
    try {
      state = getOrCreateDailyVisitorState(
        window.localStorage,
        japanCalendarDate(),
        () => window.crypto.randomUUID(),
      );
    } catch {
      // Without durable browser storage, a safe same-day deduplication is not possible.
      return;
    }
    if (state.recorded) return;

    void recordDailyUniqueVisitor(state.token)
      .then(() => {
        try {
          markDailyVisitorRecorded(window.localStorage, state);
        } catch {
          // The server-side unique count is already complete.
        }
      })
      .catch(() => {
        // Keep the same token pending so a later page load can retry idempotently.
      });
  }, [enabled]);

  return null;
}
