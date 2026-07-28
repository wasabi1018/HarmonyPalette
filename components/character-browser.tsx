"use client";

import Link from "next/link";
import { ArrowRight, CakeSlice, CalendarDays, Check, LoaderCircle, MapPin, Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Character } from "@/data/types";
import { DataStatePanel } from "@/components/data-state-panel";
import {
  daysUntilBirthday,
  formatCharacterBirthday,
  getCharacterBirthday,
  todayInJapan,
} from "@/lib/character-birthday";
import { useCharacters } from "@/lib/character-store";
import { getEntryCharacterNames, type DataLoadStatus, type ScheduleEntry, useScheduleEntries } from "@/lib/schedule-store";
import { CharacterAvatar } from "./character-avatar";

function currentTimeInJapan() {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date()).replace("：", ":");
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function compactDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function matchesCharacter(entry: ScheduleEntry, character: Character) {
  return entry.characterIds.includes(character.id) || getEntryCharacterNames(entry).includes(character.name);
}

function birthdayTimingLabel(daysUntil: number) {
  if (daysUntil === 0) return "今日が誕生日！";
  if (daysUntil <= 30) return `あと${daysUntil}日`;
  return null;
}

export function CharacterBrowser({
  initialCharacters,
  initialStatus,
}: {
  initialCharacters?: Character[];
  initialStatus?: DataLoadStatus;
}) {
  const characterState = useCharacters({ initialCharacters, initialStatus });
  const scheduleState = useScheduleEntries();
  const { characters } = characterState;
  const { entries } = scheduleState;
  const today = useMemo(todayInJapan, []);
  const scheduleTo = useMemo(() => addDays(today, 13), [today]);
  const currentTime = useMemo(currentTimeInJapan, []);
  const [query, setQuery] = useState("");
  const [onlyScheduled, setOnlyScheduled] = useState(false);
  const filtered = useMemo(() => characters.filter((character) => {
    const matchesQuery = `${character.name}${character.nameKana}`.includes(query.trim());
    const matchesSchedule = !onlyScheduled || entries.some((entry) => (
      entry.date <= today
      && (entry.endDate ?? entry.date) >= today
      && matchesCharacter(entry, character)
    ));
    return matchesQuery && matchesSchedule;
  }), [characters, entries, onlyScheduled, query, today]);

  const nextScheduleFor = (character: Character) => entries
    .filter((entry) => (
      matchesCharacter(entry, character)
      && entry.status !== "completed"
      && (entry.endDate ?? entry.date) >= today
      && (
        entry.date > today
        || (entry.date === today && (entry.endTime ?? entry.startTime) >= currentTime)
        || (entry.date < today && (entry.endDate ?? entry.date) >= today)
      )
    ))
    .sort((left, right) => `${left.date}-${left.startTime}`.localeCompare(`${right.date}-${right.startTime}`))[0];

  const characterProblem = characters.length === 0 && (
    characterState.status === "error" || characterState.status === "unavailable"
      ? characterState.status
      : null
  );
  const characterLoading = characterState.status === "loading" && characters.length === 0;

  return <div className="mt-8">
    <div className="rounded-[26px] border border-pink/10 bg-white p-5 shadow-soft sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-pink" aria-hidden="true" /><h2 className="font-black text-ink">キャラクターを探す</h2></div><p className="mt-2 text-xs leading-6 text-ink/55">名前や今日の登場予定から絞り込めます。</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><span className="sr-only">キャラクター名で検索</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前で検索" className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] pl-10 pr-4 text-sm font-bold text-ink outline-none placeholder:text-ink/35 focus:border-pink sm:w-56" /></label><button type="button" disabled={scheduleState.status !== "success"} onClick={() => setOnlyScheduled((value) => !value)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-45 ${onlyScheduled ? "border-pink bg-pink text-white" : "border-ink/10 text-ink/65 hover:border-pink/30 hover:text-pink"}`}><Check size={15} aria-hidden="true" />今日会える</button></div></div></div>
    {characterLoading ? (
      <div className="mt-5"><DataStatePanel state="loading" message="キャラクターを読み込んでいます…" /></div>
    ) : characterProblem ? (
      <div className="mt-5">
        <DataStatePanel
          state={characterProblem}
          message={characterProblem === "unavailable"
            ? "現在、キャラクター情報を表示できません。"
            : "キャラクターを読み込めませんでした。"}
          onRetry={characterState.retry}
        />
      </div>
    ) : (
      <>
        <p className="mt-5 flex items-center gap-2 text-sm font-bold text-ink/55">
          <span><span className="text-pink">{filtered.length}</span> キャラクター</span>
          {characterState.isRefreshing && <span className="inline-flex items-center gap-1 text-[11px] text-pink" role="status"><LoaderCircle size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />更新中…</span>}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((character) => {
          const next = nextScheduleFor(character);
          const birthday = getCharacterBirthday(character);
          const birthdayTiming = birthday
            ? birthdayTimingLabel(daysUntilBirthday(birthday, today))
            : null;
          const scheduleLoading = scheduleState.status === "loading";
          const scheduleUnavailable = scheduleState.status === "error" || scheduleState.status === "unavailable";
          const scheduleHref = `/schedule?character=${encodeURIComponent(character.name)}&from=${today}&to=${scheduleTo}#schedule-results`;
          const nextDate = next && next.date <= today && (next.endDate ?? next.date) >= today
            ? "今日"
            : next
              ? compactDate(next.date)
              : "";
          return (
            <article key={character.id} className="group rounded-[22px] border border-pink/10 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card">
              <div className="flex items-center gap-3">
                <CharacterAvatar character={character} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-black text-ink group-hover:text-pink">{character.name}</h3>
                  {birthday && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <p className="inline-flex items-center gap-1.5 rounded-full bg-lavender/10 px-2 py-1 text-[10px] font-black text-lavender">
                        <CakeSlice size={11} aria-hidden="true" />
                        誕生日 {formatCharacterBirthday(birthday)}
                      </p>
                      {birthdayTiming && (
                        <span className={`rounded-full px-2 py-1 text-[9px] font-black ${birthdayTiming === "今日が誕生日！" ? "bg-pink text-white" : "bg-pink/10 text-pink"}`}>
                          {birthdayTiming}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 rounded-[14px] bg-[#fff9fb] px-3 py-2.5">
                {scheduleLoading ? (
                  <p className="flex items-center gap-2 text-[11px] font-bold text-ink/50"><LoaderCircle size={13} className="animate-spin text-pink motion-reduce:animate-none" aria-hidden="true" />予定を読み込み中…</p>
                ) : scheduleUnavailable ? (
                  <p className="text-[11px] font-bold text-ink/50">予定情報を取得できません</p>
                ) : next ? (
                  <div>
                    <p className="flex min-w-0 items-center gap-2 text-[12px] font-black text-ink"><Sparkles size={13} className="shrink-0 text-pink" aria-hidden="true" /><span className="line-clamp-1">{next.title}</span></p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-3 text-[10px] font-bold text-ink/45">
                      <p className="flex shrink-0 items-center gap-1.5"><CalendarDays size={12} className="text-pink" aria-hidden="true" />次回 {nextDate} {next.startTime}</p>
                      <p className="flex min-w-0 items-center gap-1.5"><MapPin size={11} className="shrink-0 text-mint" aria-hidden="true" /><span className="truncate">{next.location}</span></p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-ink/45">今後の登場予定はありません</p>
                )}
              </div>
              <Link href={scheduleHref} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full px-1 text-xs font-black text-pink group-hover:gap-3">
                予定を見る <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </article>
          );
        })}</div>
        {filtered.length === 0 && <div className="mt-5 rounded-[26px] border border-dashed border-pink/20 bg-white p-10 text-center font-black text-ink">見つかりませんでした</div>}
      </>
    )}
  </div>;
}
