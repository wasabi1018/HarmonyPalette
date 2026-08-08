"use client";

import { CalendarDays, Clock3, Users } from "lucide-react";
import { type InitialCharacterData, useCharacters } from "@/lib/character-store";
import { getEntryCharacterNames, type InitialScheduleData, useScheduleEntries } from "@/lib/schedule-store";

export function HomeHeroStats({
  initialScheduleData,
  initialCharacterData,
}: {
  initialScheduleData: InitialScheduleData;
  initialCharacterData: InitialCharacterData;
}) {
  const scheduleState = useScheduleEntries({ initialData: initialScheduleData });
  const characterState = useCharacters({ initialData: initialCharacterData });
  const { entries } = scheduleState;
  const { characters } = characterState;
  const isLoading = scheduleState.status === "loading" || characterState.status === "loading";
  const isAvailable = scheduleState.status === "success" && characterState.status === "success";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const now = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date()).replace("：", ":");
  const todayEntries = entries.filter((entry) => entry.date === today);
  const characterNames = new Set(todayEntries.flatMap((entry) => getEntryCharacterNames(entry)));
  const characterIds = new Set(todayEntries.flatMap((entry) => entry.characterIds));
  const characterCount = new Set([
    ...characterNames,
    ...characters.filter((character) => characterIds.has(character.id)).map((character) => character.name),
  ]).size;
  const nextSchedule = todayEntries.find((entry) => (entry.endTime || entry.startTime) >= now);

  return (
    <div className="mt-2.5 grid grid-cols-3 gap-2">
      <div className="rounded-2xl bg-[#fff0f5] px-2 py-2 text-center sm:py-2.5">
        <Users size={16} className="mx-auto text-pink" aria-hidden="true" />
        <p className="mt-1 text-[10px] font-bold text-ink/45">今日会える</p>
        <p className="text-[15px] font-black text-ink">{isAvailable ? `${characterCount}人` : "—"}</p>
      </div>
      <div className="rounded-2xl bg-[#eef9f4] px-2 py-2 text-center sm:py-2.5">
        <CalendarDays size={16} className="mx-auto text-[#53a687]" aria-hidden="true" />
        <p className="mt-1 text-[10px] font-bold text-ink/45">今日の予定</p>
        <p className="text-[15px] font-black text-ink">{scheduleState.status === "success" ? `${todayEntries.length}件` : "—"}</p>
      </div>
      <div className="rounded-2xl bg-[#f3effa] px-2 py-2 text-center sm:py-2.5">
        <Clock3 size={16} className="mx-auto text-lavender" aria-hidden="true" />
        <p className="mt-1 text-[10px] font-bold text-ink/45">次の予定</p>
        <p className="text-[15px] font-black text-ink">{scheduleState.status === "success" ? nextSchedule?.startTime || "—" : "—"}</p>
      </div>
      {isLoading && <span className="sr-only" role="status">今日の情報を読み込んでいます…</span>}
    </div>
  );
}
