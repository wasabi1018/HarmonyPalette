import type { Metadata } from "next";
import { InstagramDmCampaignManager } from "@/components/admin/instagram-dm-campaign-manager";
import { InstagramPageHeading } from "@/components/admin/instagram-workspace";
export const metadata: Metadata = { title: "Instagram DM送信状況" };
export default function InstagramDmDeliveriesPage() {
  return <><InstagramPageHeading title="DM送信状況" description="最近の送信結果から、失敗・要確認の処理を確認します。" category="dm" /><InstagramDmCampaignManager view="deliveries" /></>;
}
