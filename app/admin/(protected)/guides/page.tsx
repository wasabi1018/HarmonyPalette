import type { Metadata } from "next";
import { GuideManager } from "@/components/admin/guide-manager";
import { getGuideManagementData } from "@/lib/guides/repository";

export const metadata: Metadata = { title: "攻略ガイド管理" };
export const dynamic = "force-dynamic";
export default async function AdminGuidesPage() {
  let data;
  try { data = await getGuideManagementData(); }
  catch { return <div className="p-6"><h1 className="text-2xl font-black">攻略ガイド管理</h1><p role="alert" className="mt-4 text-sm leading-7">攻略ガイドの設定を読み込めませんでした。接続設定とstrategy_guidesマイグレーションの適用状況を確認してください。</p></div>; }
  return <GuideManager initialData={data} />;
}
