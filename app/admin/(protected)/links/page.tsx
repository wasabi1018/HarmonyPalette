import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Link2, Sparkles } from "lucide-react";
import { LinkPageSettingsForm } from "@/components/admin/link-page-settings-form";
import { getLinkPageSettings } from "@/lib/link-page-settings";

export const metadata: Metadata = {
  title: "リンク集設定",
  description: "Instagram用リンク集と楽天ROOMのリンクを管理します。",
};

export default async function AdminLinksPage() {
  let rakutenRoomUrl = "";
  let setupError = "";
  try {
    rakutenRoomUrl = (await getLinkPageSettings()).rakutenRoomUrl;
  } catch (error) {
    setupError = error instanceof Error
      ? error.message
      : "リンク集設定の取得に失敗しました。";
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav
        aria-label="パンくずリスト"
        className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40"
      >
        <Link href="/admin" className="hover:text-pink">管理トップ</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page">リンク集設定</span>
      </nav>

      <div className="mb-5 overflow-hidden rounded-[26px] border border-pink/10 bg-gradient-to-br from-[#fff0f5] via-white to-[#f4f0fb] px-5 py-6 sm:px-8">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-pink">
          <Link2 size={15} aria-hidden="true" />
          PROFILE LINKS
        </p>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink sm:text-[36px]">
          リンク集設定
        </h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-bold leading-6 text-ink/55">
          Instagramプロフィールから案内するリンク集ページを管理します。
        </p>
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[10px] font-black text-lavender shadow-sm">
          <Sparkles size={14} aria-hidden="true" />
          楽天ROOMはリンク一覧の一番下に表示
        </span>
      </div>

      <LinkPageSettingsForm
        initialRakutenRoomUrl={rakutenRoomUrl}
        setupError={setupError}
      />
    </div>
  );
}
