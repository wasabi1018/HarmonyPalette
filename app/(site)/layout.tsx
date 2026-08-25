import { Suspense } from "react";
import { AdSenseAutoAds } from "@/components/adsense-auto-ads";
import { SiteShell } from "@/components/site-shell";
import { GOOGLE_ADSENSE_ACCOUNT } from "@/lib/site-config";

export default function PublicSiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
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
