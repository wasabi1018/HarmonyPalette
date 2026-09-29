import { Suspense } from "react";
import { AdSenseAutoAds } from "@/components/adsense-auto-ads";
import { DailyUniqueVisitorTracker } from "@/components/daily-unique-visitor-tracker";
import { SiteShell } from "@/components/site-shell";
import { GOOGLE_ADSENSE_ACCOUNT } from "@/lib/site-config";

export default function PublicSiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = process.env.NODE_ENV === "production"
    && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");

  return (
    <>
      <DailyUniqueVisitorTracker enabled={analyticsEnabled} />
      <Suspense fallback={null}>
        <AdSenseAutoAds
          account={GOOGLE_ADSENSE_ACCOUNT}
          enabled={process.env.NODE_ENV === "production"}
        />
      </Suspense>
      <SiteShell>{children}</SiteShell>
    </>
  );
}
