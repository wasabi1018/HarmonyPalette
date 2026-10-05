"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarOff, CheckCircle2, ClipboardList, LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getHomepageTodayStatus } from "@/lib/homepage-today-status";
import { useParkOperatingDays, type InitialParkOperatingDayData } from "@/lib/park-operating-day-store";
import { useScheduleEntries, type InitialScheduleData } from "@/lib/schedule-store";
import { ParkOperatingInfo } from "@/components/park-operating-info";

export function HomeTodayOverview({ initialScheduleData, initialOperatingDayData }: { initialScheduleData: InitialScheduleData; initialOperatingDayData: InitialParkOperatingDayData }) {
  const schedules = useScheduleEntries({ initialData: initialScheduleData });
  const operating = useParkOperatingDays(initialOperatingDayData);
  const [clock, setClock] = useState({ now: new Date(), ready: false });
  useEffect(() => {
    const update = () => setClock({ now: new Date(), ready: true });
    update(); const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(clock.now);
  const currentTime = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(clock.now).replace("：", ":");
  const dateLabel = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short" }).format(clock.now);
  const status = getHomepageTodayStatus({ today, currentTime, entries: schedules.entries, loadStatus: schedules.status, operatingDay: operating.operatingDays.find((entry) => entry.date === today), clockReady: clock.ready });
  const StatusIcon = status.kind === "closed" ? CalendarOff : status.kind === "loading" ? LoaderCircle : CheckCircle2;
  return (
    <section aria-label="今日の確認" className="border-y border-pink/10 bg-[#fff1f6]">
      <div className="mx-auto grid max-w-[1200px] gap-4 px-4 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-center md:gap-6 md:py-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="flex items-center gap-2 text-[23px] font-black tracking-tight text-ink sm:text-[30px]"><CalendarDays size={24} className="shrink-0 text-pink" aria-hidden="true" /><time dateTime={today}>{dateLabel}</time></p>
            <ParkOperatingInfo date={today} operatingDays={operating.operatingDays} className="rounded-full bg-white/80 px-3 py-1.5" />
          </div>
          <p className="mt-3 flex items-start gap-2 text-[14px] font-bold leading-6 text-ink sm:text-[17px]"><StatusIcon size={20} className={`mt-0.5 shrink-0 text-pink ${status.kind === "loading" ? "animate-spin" : ""}`} aria-hidden="true" /><span>{status.label}</span></p>
          {status.kind === "error" && <button type="button" onClick={schedules.retry} className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-[#b43e68] underline">再読み込み</button>}
          {operating.status === "error" && <button type="button" onClick={operating.retry} className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-[#b43e68] underline">営業情報を再読み込み</button>}
        </div>
        <div>
          <Link href={status.kind === "closed" ? "/daily-schedule" : "#today-schedule"} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c94372] px-4 py-3 text-[15px] font-black text-white shadow-soft transition hover:bg-[#b43e68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2">{status.kind === "closed" ? "別の日の予定を調べる" : "今日の全予定を見る"}<ArrowRight size={18} aria-hidden="true" /></Link>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/schedule" className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-pink/15 bg-white px-3 text-[13px] font-black text-ink hover:text-[#b43e68]"><Search size={17} aria-hidden="true" />キャラ検索</Link>
            <Link href={`/plan?date=${today}`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-pink/15 bg-white px-3 text-[13px] font-black text-ink hover:text-[#b43e68]"><ClipboardList size={17} aria-hidden="true" />マイプラン</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
