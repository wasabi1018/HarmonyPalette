import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, Settings2 } from "lucide-react";

export const metadata: Metadata = {
  title: "管理ページ",
  description: "Harmony Paletteのローカル管理ページです。",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-[980px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-pink/10 bg-gradient-to-br from-[#fff0f5] to-white p-6 sm:p-8">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-pink"><Settings2 size={15} aria-hidden="true" />LOCAL ADMIN</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Harmony Palette 管理ページ</h1>
        <p className="mt-3 text-[13px] font-bold leading-6 text-ink/55">現在はスケジュール管理のみ利用できます。内容はこのブラウザーに保存されます。</p>
      </div>
      <Link href="/admin/schedule" className="mt-5 flex items-center gap-4 rounded-2xl border border-pink/10 bg-white p-5 shadow-soft transition-transform hover:-translate-y-0.5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-pink/10 text-pink"><CalendarDays size={22} aria-hidden="true" /></span><span className="min-w-0 flex-1"><strong className="block text-[16px] font-black text-ink">スケジュール管理</strong><span className="mt-1 block text-[12px] font-bold text-ink/45">イベント・グリーティングの追加と削除</span></span><ChevronRight size={18} className="text-pink" aria-hidden="true" /></Link>
    </div>
  );
}
