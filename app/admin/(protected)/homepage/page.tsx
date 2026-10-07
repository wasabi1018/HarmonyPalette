import type { Metadata } from "next";
import Link from "next/link";
import { HomepageSettingsForm } from "@/components/admin/homepage-settings-form";
import { createDefaultHomepageGuideCards } from "@/lib/homepage-guide-cards";
import { getHomepageSettings } from "@/lib/homepage-settings";

export const metadata: Metadata = { title: "TOPページ設定" };

export default async function AdminHomepagePage() {
  let cards = createDefaultHomepageGuideCards();
  let setupError = "";
  try { cards = (await getHomepageSettings()).guideCards; }
  catch (error) { setupError = error instanceof Error ? error.message : "設定を取得できませんでした。"; }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="パンくずリスト" className="mb-3 text-[13px] text-ink/65"><Link href="/admin" className="hover:text-pink">管理トップ</Link> / TOPページ設定</nav>
      <h1 className="text-[28px] font-black text-ink">TOPページ設定</h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-ink/65">来園に役立つガイドの見出し・リンク先・説明文を管理します。</p>
      <HomepageSettingsForm initialCards={cards} setupError={setupError} />
    </div>
  );
}
