import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstagramDmCampaignManager } from "@/components/admin/instagram-dm-campaign-manager";
import { InstagramPageHeading } from "@/components/admin/instagram-workspace";
export const metadata: Metadata = { title: "DMキャンペーン詳細" };
export default async function InstagramDmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  return <><InstagramPageHeading title="DMキャンペーン詳細" description="登録素材を確認して、自動返信の開始・一時停止を操作します。" category="dm" /><InstagramDmCampaignManager key={id} view="detail" campaignId={id} /></>;
}
