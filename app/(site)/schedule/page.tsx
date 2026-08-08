import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { OfficialNotice } from "@/components/official-notice";
import { ScheduleBrowser } from "@/components/schedule-browser";

export const metadata: Metadata = {
  title: "グリーティング・イベントスケジュール",
  description: "日付、キャラクター、イベント種別、開催場所から、ハーモニーランドの予定を探せます。",
  alternates: { canonical: "/schedule" },
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    character?: string | string[];
    event?: string | string[];
    from?: string | string[];
    to?: string | string[];
    view?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedCharacters = Array.isArray(params.character)
    ? params.character
    : params.character
      ? [params.character]
      : [];
  const initialCharacters = Array.from(new Set(requestedCharacters.map((name) => name.trim()).filter(Boolean)));
  const requestedEvents = Array.isArray(params.event)
    ? params.event
    : params.event
      ? [params.event]
      : [];
  const initialEvents = Array.from(new Set(requestedEvents.map((name) => name.trim()).filter(Boolean)));
  const dateParam = (value?: string | string[]) => {
    const candidate = Array.isArray(value) ? value[0] : value;
    return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : undefined;
  };
  const initialFromDate = dateParam(params.from);
  const initialToDate = dateParam(params.to);
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const initialView = requestedView === "list" ? "list" : "calendar";

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <nav aria-label="パンくずリスト" className="mb-3 flex items-center gap-1 text-[11px] font-bold text-ink/40"><Link href="/" className="hover:text-pink">ホーム</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">スケジュール</span></nav>
      <section className="relative overflow-hidden rounded-[26px] border border-pink/10 bg-gradient-to-br from-[#fff0f5] via-white to-[#eefaf4] px-5 py-6 sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/70" aria-hidden="true" />
        <div className="relative">
          <div className="max-w-2xl"><p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-pink"><Sparkles size={14} aria-hidden="true" />GREETING &amp; EVENT SCHEDULE</p><h1 className="mt-2 font-display text-[28px] font-semibold leading-tight text-ink sm:text-[38px]">会いたい予定を、すぐ見つけよう。</h1><p className="mt-3 text-[13px] font-bold leading-6 text-ink/60 sm:text-[14px]">日付・イベント・複数のキャラクターから、グリーティングとイベントをまとめて検索できます。</p></div>
        </div>
      </section>
      <ScheduleBrowser
        initialCharacters={initialCharacters}
        initialEvents={initialEvents}
        initialFromDate={initialFromDate}
        initialToDate={initialToDate}
        initialView={initialView}
      />
      <div className="mt-7"><OfficialNotice /></div>
    </div>
  );
}
