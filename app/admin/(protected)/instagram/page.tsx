import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Instagram, Sparkles } from "lucide-react";
import { InstagramScheduleStudio } from "@/components/admin/instagram-schedule-studio";

export const metadata: Metadata = {
  title: "Instagram画像作成",
  description: "全体予定とファンスタジオの週間・日別予定をInstagram投稿画像にまとめます。",
};

export default function AdminInstagramPage() {
  return (
    <div className="mx-auto max-w-[1420px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav
        aria-label="パンくずリスト"
        className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40"
      >
        <Link href="/admin" className="hover:text-pink">
          管理トップ
        </Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page">Instagram画像作成</span>
      </nav>

      <div className="mb-5 overflow-hidden rounded-[26px] border border-pink/10 bg-gradient-to-br from-[#fff0f5] via-white to-[#f4f0fb] px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-pink">
              <Instagram size={15} aria-hidden="true" />
              INSTAGRAM STUDIO
            </p>
            <h1 className="mt-2 font-display text-[28px] font-semibold text-ink sm:text-[36px]">
              Instagram画像作成
            </h1>
            <p className="mt-2 max-w-[720px] text-[13px] font-bold leading-6 text-ink/55">
              管理中の予定から、全体スケジュールとファンスタジオの週間・日別投稿画像を自動作成します。1か月分も週ごとにまとめて保存できます。
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[10px] font-black text-lavender shadow-sm">
            <Sparkles size={14} aria-hidden="true" />
            予定の入力し直しは不要
          </span>
        </div>
      </div>

      <InstagramScheduleStudio />
    </div>
  );
}
