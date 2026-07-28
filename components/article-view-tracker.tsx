"use client";

import { useEffect } from "react";

export function ArticleViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `harmony-palette:article-view:${slug}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "pending");
    } catch {
      // Tracking still works when session storage is unavailable.
    }

    void fetch(`/api/articles/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error("view tracking failed");
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
  }, [slug]);

  return null;
}
