"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdSenseEligiblePage } from "@/lib/adsense";

export function AdSenseAutoAds({
  account,
  enabled,
}: {
  account: string;
  enabled: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isIndexable, setIsIndexable] = useState(false);

  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? "";
    const directives = robots.toLocaleLowerCase().split(",").map((value) => value.trim());
    setIsIndexable(!directives.includes("noindex"));
  }, [pathname, searchParams]);

  if (!enabled || !isIndexable || !isAdSenseEligiblePage(pathname, searchParams)) {
    return null;
  }

  return (
    <Script
      id="google-adsense-auto-ads"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${account}`}
      strategy="afterInteractive"
    />
  );
}
