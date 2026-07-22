"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, PartyPopper, Sparkles, Sun } from "lucide-react";
import type { Character } from "@/data/types";
import { mergeCharactersWithNames, sortCharacterNames, useCharacters } from "@/lib/character-store";
import { fanStudioFallbackName, isFanStudioGreeting, shortFanStudioLocation, specialAppearance } from "@/lib/schedule-display";
import { getEntryCharacterNames, type ScheduleEntry, useScheduleEntries } from "@/lib/schedule-store";
import { CharacterAvatar } from "@/components/character-avatar";
import { SectionHeading } from "@/components/section-heading";

function japanDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function japanTime(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date).replace("：", ":");
}

function entryStatus(entry: ScheduleEntry, today: string, currentTime: string) {
  const entryEndDate = entry.endDate ?? entry.date;
  if (entryEndDate < today || entry.status === "completed" || (entryEndDate === today && entry.endTime && entry.endTime <= currentTime)) {
    return { label: "終了", className: "bg-ink/5 text-ink/45" };
  }
  if (entry.date <= today && entryEndDate >= today && entry.startTime <= currentTime) {
    return { label: "進行中", className: "bg-mint/15 text-[#35745f]" };
  }
  return null;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  const safeMinutes = Math.min(Math.max(minutes, 0), 23 * 60 + 59);
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, "0")}:${String(safeMinutes % 60).padStart(2, "0")}`;
}

function timelineEndTime(entry: ScheduleEntry) {
  return entry.endTime ?? minutesToTime(timeToMinutes(entry.startTime) + 30);
}

function groupTimelineEntries(entries: ScheduleEntry[]) {
  const groups = new Map<string, ScheduleEntry[]>();
  entries.forEach((entry) => {
    const endTime = timelineEndTime(entry);
    const key = `${entry.startTime}-${endTime}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  });
  return Array.from(groups.entries())
    .map(([key, groupedEntries]) => ({
      key,
      startTime: groupedEntries[0].startTime,
      endTime: timelineEndTime(groupedEntries[0]),
      entries: groupedEntries,
    }))
    .sort((left, right) => `${left.startTime}-${left.endTime}`.localeCompare(`${right.startTime}-${right.endTime}`));
}

function displayScheduleDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00+09:00`));
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function displayUpdatedAt(value?: string) {
  if (!value) return "更新日時なし";
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "").slice(0, 16).replaceAll("-", "/");
}

export function HomeTodaySections() {
  const entries = useScheduleEntries();
  const catalogCharacters = useCharacters();
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => japanDate());
  const today = japanDate(now);
  const currentTime = japanTime(now);
  const todayGreetings = entries
    .filter((entry) => entry.kind === "greeting" && entry.date === today)
    .sort((left, right) => `${left.startTime}-${left.title}`.localeCompare(`${right.startTime}-${right.title}`, "ja"));
  const selectedSchedules = entries
    .filter((entry) => entry.date <= selectedDate && (entry.endDate ?? entry.date) >= selectedDate)
    .sort((left, right) => `${left.startTime}-${left.title}`.localeCompare(`${right.startTime}-${right.title}`, "ja"));
  const eventSchedules = selectedSchedules.filter((entry) => !isFanStudioGreeting(entry));
  const fanStudioSchedules = selectedSchedules.filter(isFanStudioGreeting);
  const eventGroups = groupTimelineEntries(eventSchedules);
  const fanStudioGroups = groupTimelineEntries(fanStudioSchedules).map((group) => ({
    ...group,
    entries: [...group.entries].sort((left, right) => left.location.localeCompare(right.location, "ja")),
  }));
  const timelineBoundaries = Array.from(new Set(selectedSchedules.flatMap((entry) => [
    entry.startTime,
    timelineEndTime(entry),
  ]))).sort();
  const timelineSegments = timelineBoundaries.slice(0, -1).map((startTime, index) => ({
    startTime,
    endTime: timelineBoundaries[index + 1],
  }));
  const timelineRows = [
    ...timelineSegments.map((segment) => {
      const duration = timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime);
      return `minmax(${Math.max(48, duration * 1.8)}px, auto)`;
    }),
    "0px",
  ].join(" ");
  const timelineBoundaryIndex = new Map(timelineBoundaries.map((time, index) => [time, index]));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const characters = mergeCharactersWithNames(
    catalogCharacters,
    [...todayGreetings, ...selectedSchedules].flatMap((entry) => getEntryCharacterNames(entry)),
  );

  const characterById = new Map(characters.map((character) => [character.id, character]));
  const appearingIds = new Set(todayGreetings.flatMap((entry) => entry.characterIds));
  const appearingNames = new Set(todayGreetings.flatMap((entry) => getEntryCharacterNames(entry)));
  const todayCharacters = characters
    .filter((character) => appearingIds.has(character.id) || appearingNames.has(character.name));

  const latestUpdatedAt = selectedSchedules
    .map((entry) => entry.updatedAt)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];

  const namesForEntry = (entry: ScheduleEntry) => {
    const names = [
      ...getEntryCharacterNames(entry),
      ...entry.characterIds.map((id) => characterById.get(id)?.name).filter(Boolean) as string[],
    ];
    return sortCharacterNames(names, characters);
  };

  const nextForCharacter = (character: Character) => todayGreetings.find((entry) => (
    entry.characterIds.includes(character.id) || namesForEntry(entry).includes(character.name)
  ));

  return (
    <>
      <section id="today-characters" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-10 sm:px-6 sm:pt-12 lg:px-8">
        <SectionHeading
          eyebrow="TODAY, I CAN MEET"
          title="今日会えるキャラクター"
          description="公開済みスケジュールから、今日の登場予定を表示しています。"
          href="/characters"
        />
        {todayCharacters.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {todayCharacters.slice(0, 8).map((character) => {
              const next = nextForCharacter(character);
              return (
                <Link
                  key={character.id}
                  href={`/schedule?character=${encodeURIComponent(character.name)}`}
                  className="group rounded-[20px] border border-pink/10 bg-white p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-card sm:p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <CharacterAvatar character={character} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-black leading-[1.3] text-ink sm:text-[15px]">{character.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-[#4b9c7d] sm:text-[11px]">今日会える予定</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-[#fff8fb] px-3 py-2.5">
                    <p className="text-[9px] font-black tracking-[0.1em] text-ink/35">NEXT GREETING</p>
                    <p className="mt-1 text-[13px] font-black text-ink">
                      {next?.startTime || "時間を確認中"}
                      <span className="ml-1.5 block truncate text-[10px] font-medium text-ink/45 sm:inline">{next?.location}</span>
                    </p>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-pink group-hover:underline">
                    予定を見る <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-pink/20 bg-white px-4 py-7 text-center text-[12px] font-bold text-ink/50">
            今日の公開済みキャラクター予定はまだありません。
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-lavender/15 bg-[#f7f3fb] px-4 py-3 text-[11px] font-bold leading-5 text-ink/60">
          <span className="inline-flex items-center gap-1.5 text-lavender"><Sparkles size={14} aria-hidden="true" />ファンスタジオ</span>
          <span>取込後に確認・公開した予定を反映します。</span>
          <span className="text-ink/35">最新情報は公式サイトもご確認ください。</span>
        </div>
      </section>

      <section id="today-schedule" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-12 sm:px-6 lg:px-8">
        <div className="rounded-[26px] border border-pink/10 bg-[#fff6f9] p-3.5 sm:p-6">
          <SectionHeading
            eyebrow="TODAY'S SCHEDULE"
            title={selectedDate === today ? "今日のスケジュール" : `${displayScheduleDate(selectedDate)}のスケジュール`}
            description={`${displayScheduleDate(selectedDate)}のイベントと、会えるキャラクターを時間順にまとめています。`}
            href="/schedule"
            linkLabel="全スケジュール"
          />
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-pink/10 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex items-center gap-2 text-[12px] font-black text-ink/60">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-pink/10 text-pink"><CalendarDays size={16} aria-hidden="true" /></span>
              確認したい日を選択
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setSelectedDate((date) => addDays(date, -1))} aria-label="前日のスケジュール" className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 bg-white text-ink/60 transition-colors hover:border-pink/30 hover:text-pink"><ChevronLeft size={17} aria-hidden="true" /></button>
              <label className="relative min-w-[170px] flex-1 sm:flex-none">
                <span className="sr-only">対象日</span>
                <input type="date" value={selectedDate} onChange={(event) => event.target.value && setSelectedDate(event.target.value)} className="min-h-10 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[12px] font-black text-ink outline-none focus:border-pink" />
              </label>
              <button type="button" onClick={() => setSelectedDate((date) => addDays(date, 1))} aria-label="翌日のスケジュール" className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 bg-white text-ink/60 transition-colors hover:border-pink/30 hover:text-pink"><ChevronRight size={17} aria-hidden="true" /></button>
              <button type="button" onClick={() => setSelectedDate(today)} disabled={selectedDate === today} className="min-h-10 rounded-xl bg-pink/10 px-3 text-[11px] font-black text-pink disabled:cursor-default disabled:opacity-40">今日</button>
            </div>
          </div>
          {timelineSegments.length > 0 ? (
            <div className="overflow-hidden rounded-[18px] border border-pink/10 bg-white shadow-[0_8px_24px_rgba(118,73,86,0.05)]">
              <div className="grid grid-cols-[38px_minmax(0,1.1fr)_minmax(0,.9fr)] gap-1.5 border-b border-pink/10 bg-[#fffafd] px-2 py-2.5 sm:grid-cols-[64px_minmax(0,1.25fr)_minmax(0,.75fr)] sm:gap-3 sm:px-4 sm:py-3">
                <div className="flex items-center gap-1 text-[9px] font-black text-ink/35 sm:text-[11px]">
                  <Clock3 size={12} aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">時間</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#fff0df] text-[#a76624] sm:h-7 sm:w-7"><PartyPopper size={13} aria-hidden="true" /></span>
                  <div className="min-w-0"><p className="truncate text-[10px] font-black leading-4 text-ink sm:text-[12px]">イベントスケジュール</p><p className="hidden text-[8px] font-black tracking-[0.12em] text-[#a76624] sm:block">EVENT</p></div>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-lavender/10 text-lavender sm:h-7 sm:w-7"><Sparkles size={13} aria-hidden="true" /></span>
                  <div className="min-w-0"><p className="truncate text-[10px] font-black leading-4 text-ink sm:text-[12px]">ファンスタジオ</p><p className="text-[8px] font-black leading-3 text-lavender sm:tracking-[0.08em]">グリーティング</p></div>
                </div>
              </div>

              <div
                className="relative grid grid-cols-[38px_minmax(0,1.1fr)_minmax(0,.9fr)] px-2 pb-5 pt-1 sm:grid-cols-[64px_minmax(0,1.25fr)_minmax(0,.75fr)] sm:px-4 sm:pb-6 sm:pt-2"
                style={{ gridTemplateRows: timelineRows }}
              >
                {timelineSegments.map((segment, index) => (
                  <div key={segment.startTime} className="contents">
                    <div
                      className={`pointer-events-none z-0 border-t ${segment.startTime.endsWith(":00") ? "border-pink/20" : "border-dashed border-ink/10"}`}
                      style={{ gridColumn: "1 / -1", gridRow: String(index + 1) }}
                      aria-hidden="true"
                    />
                    <div
                      className="relative z-[1] border-r border-pink/20 pr-2 pt-2 text-right sm:pr-3"
                      style={{ gridColumn: "1", gridRow: String(index + 1) }}
                    >
                      <time className="text-[10px] font-black leading-none tabular-nums text-ink/65 sm:text-[13px]">{segment.startTime}</time>
                      <span className="absolute -right-[4px] top-[10px] h-[7px] w-[7px] rounded-full border-2 border-white bg-pink" aria-hidden="true" />
                    </div>
                  </div>
                ))}

                <div
                  className={`pointer-events-none z-0 h-0 border-t ${timelineBoundaries.at(-1)?.endsWith(":00") ? "border-pink/20" : "border-dashed border-ink/10"}`}
                  style={{ gridColumn: "1 / -1", gridRow: String(timelineSegments.length + 1) }}
                  aria-hidden="true"
                />
                <div
                  className="relative z-[1] h-0 border-r border-pink/20 text-right"
                  style={{ gridColumn: "1", gridRow: String(timelineSegments.length + 1) }}
                >
                  <time className="absolute right-2 top-0 -translate-y-1/2 text-[10px] font-black leading-none tabular-nums text-ink/65 sm:right-3 sm:text-[13px]">
                    {timelineBoundaries.at(-1)}
                  </time>
                  <span className="absolute -right-[4px] top-0 h-[7px] w-[7px] -translate-y-1/2 rounded-full border-2 border-white bg-pink" aria-hidden="true" />
                </div>

                {eventGroups.map((group) => {
                  const startLine = (timelineBoundaryIndex.get(group.startTime) ?? 0) + 1;
                  const endLine = (timelineBoundaryIndex.get(group.endTime) ?? startLine) + 1;
                  return (
                    <div
                      key={group.key}
                      className="z-10 p-1.5 sm:p-2"
                      style={{ gridColumn: "2", gridRow: `${startLine} / ${endLine}` }}
                    >
                      <div className="grid h-full auto-rows-fr gap-1.5">
                        {group.entries.map((entry) => {
                          const status = entryStatus(entry, today, currentTime);
                          const names = namesForEntry(entry);
                          return (
                            <article key={entry.id} className={`h-full min-w-0 rounded-xl border border-[#eed8aa] bg-[#fffaf0] p-2 sm:p-3 ${status?.label === "終了" ? "saturate-50" : ""}`}>
                              <div className="flex items-start justify-between gap-1">
                                <h3 className="min-w-0 text-[10px] font-black leading-[1.45] text-ink sm:text-[13px]">{entry.title}</h3>
                                {status && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black sm:px-2 sm:text-[9px] ${status.className}`}>{status.label}</span>}
                              </div>
                              {names.length > 0 && <p className="mt-1 text-[9px] font-bold leading-4 text-pink sm:text-[11px]">{names.join("・")}</p>}
                              <p className="mt-1 flex min-w-0 items-center gap-1 text-[8px] font-bold leading-4 text-ink/45 sm:text-[10px]">
                                <MapPin size={10} className="shrink-0" aria-hidden="true" />
                                <span className="truncate">{entry.location}</span>
                                {entry.endTime && <span className="ml-auto shrink-0 tabular-nums">〜{entry.endTime}</span>}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {fanStudioGroups.map((group) => {
                  const startLine = (timelineBoundaryIndex.get(group.startTime) ?? 0) + 1;
                  const endLine = (timelineBoundaryIndex.get(group.endTime) ?? startLine) + 1;
                  const greetingColumnsClass = group.entries.length >= 3
                    ? "lg:grid-cols-3"
                    : group.entries.length === 2
                      ? "lg:grid-cols-2"
                      : "lg:grid-cols-1";
                  return (
                    <div
                      key={group.key}
                      className="z-10 p-1.5 sm:p-2"
                      style={{ gridColumn: "3", gridRow: `${startLine} / ${endLine}` }}
                    >
                      <div className={`grid h-full auto-rows-fr gap-1.5 ${greetingColumnsClass}`}>
                        {group.entries.map((entry) => {
                          const status = entryStatus(entry, today, currentTime);
                          const names = namesForEntry(entry);
                          const appearance = specialAppearance(entry);
                          const displayName = names.length > 0
                            ? names.join("・")
                            : fanStudioFallbackName(entry);
                          return (
                            <article key={entry.id} className={`flex min-w-0 flex-col rounded-xl border p-2 sm:p-2.5 ${appearance ? "border-[#f1cb7b] bg-[#fff8e8]" : "border-lavender/15 bg-[#f8f5fc]"} ${status?.label === "終了" ? "saturate-50" : ""}`}>
                              <div className="flex items-start justify-between gap-1">
                                <h3 className="min-w-0 break-words text-[10px] font-black leading-[1.4] text-ink sm:text-[12px]">{displayName}</h3>
                                {status && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black sm:px-2 sm:text-[9px] ${status.className}`}>{status.label}</span>}
                              </div>
                              {appearance && (
                                <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-[#f6b83f]/15 px-1.5 py-0.5 text-[8px] font-black leading-3 text-[#9a6512] sm:text-[9px]">
                                  <Sun size={10} aria-hidden="true" />{appearance}
                                </span>
                              )}
                              <p className="mt-auto truncate pt-1 text-[8px] font-bold leading-4 text-ink/45 sm:text-[10px]">
                                {shortFanStudioLocation(entry.location)}{entry.endTime ? `・〜${entry.endTime}` : ""}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-pink/20 bg-white px-4 py-7 text-center text-[12px] font-bold text-ink/50">
              {displayScheduleDate(selectedDate)}の公開済みスケジュールはまだありません。
            </p>
          )}
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
            <Clock3 size={13} aria-hidden="true" />
            最終更新：{displayUpdatedAt(latestUpdatedAt)}
            <span className="text-ink/20">|</span>
            {selectedSchedules.some((entry) => entry.isImported) ? "公式参照データ" : "サンプル・手入力データ"}
          </p>
        </div>
      </section>
    </>
  );
}
