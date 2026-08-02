"use client";

import type { SiteAnalyticsEvent } from "@/lib/articles/types";

export async function recordSiteAnalyticsEvent(eventName: SiteAnalyticsEvent) {
  const response = await fetch("/api/analytics/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName }),
    keepalive: true,
  });
  if (!response.ok) throw new Error("site analytics tracking failed");
}
