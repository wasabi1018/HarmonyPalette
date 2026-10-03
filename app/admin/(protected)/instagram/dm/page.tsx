import type { Metadata } from "next";
import { InstagramDmCampaignManager } from "@/components/admin/instagram-dm-campaign-manager";
import { InstagramPageHeading } from "@/components/admin/instagram-workspace";
export const metadata: Metadata = { title: "Instagram DM運用" };
export default function InstagramDmPage() {
  return <><InstagramPageHeading title="コメント連動DM" description="キャンペーンを選んで、素材と自動返信の状態を確認します。" category="dm" /><InstagramDmCampaignManager /></>;
}
