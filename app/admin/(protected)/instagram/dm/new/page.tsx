import type { Metadata } from "next";
import { InstagramDmCampaignManager } from "@/components/admin/instagram-dm-campaign-manager";
import { InstagramPageHeading } from "@/components/admin/instagram-workspace";
export const metadata: Metadata = { title: "DMキャンペーンを作成" };
export default function InstagramDmNewPage() {
  return <><InstagramPageHeading title="DMキャンペーンを作成" description="対象月とReelを指定して、送信前の下書きを準備します。" category="dm" /><InstagramDmCampaignManager view="new" /></>;
}
