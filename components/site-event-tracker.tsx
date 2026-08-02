"use client";

import { useEffect } from "react";
import type { SiteAnalyticsEvent } from "@/lib/articles/types";
import { recordSiteAnalyticsEvent } from "@/lib/site-analytics";

export function SiteEventTracker({
  eventName,
  sessionKey,
}: {
  eventName: SiteAnalyticsEvent;
  sessionKey: string;
}) {
  useEffect(() => {
    const japanDate = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const key = `harmony-palette:site-event:${sessionKey}:${japanDate}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "pending");
    } catch {
      // Tracking still works when session storage is unavailable.
    }

    void recordSiteAnalyticsEvent(eventName).then(() => {
      try {
        window.sessionStorage.setItem(key, "recorded");
      } catch {
        // The aggregate does not depend on browser storage.
      }
    }).catch(() => {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // No retry state is available.
      }
    });
  }, [eventName, sessionKey]);

  return null;
}
