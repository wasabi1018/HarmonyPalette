"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, LoaderCircle, MapPin, PartyPopper, Sparkles, Sun } from "lucide-react";
import type { Character } from "@/data/types";
import { compareCharacters, type InitialCharacterData, mergeCharactersWithNames, sortCharacterNames, useCharacters } from "@/lib/character-store";
import { fanStudioFallbackName, isFanStudioGreeting, shortFanStudioLocation, specialAppearance } from "@/lib/schedule-display";
import { getEntryCharacterNames, type InitialScheduleData, type ScheduleEntry, useScheduleEntries } from "@/lib/schedule-store";
import { CharacterAvatar } from "@/components/character-avatar";
import { DataStatePanel } from "@/components/data-state-panel";
import { SectionHeading } from "@/components/section-heading";
import { PlanToggleIndicator, PlanToggleSurface } from "@/components/plan-add-button";

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

function commonGroupStatus(entries: ScheduleEntry[], today: string, currentTime: string) {
  const statuses = entries.map((entry) => entryStatus(entry, today, currentTime));
  const first = statuses[0];
  if (!first) return null;
  return statuses.every((status) => status?.label === first.label) ? first : null;
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

export function HomeTodaySections({
  initialScheduleData,
  initialCharacterData,
}: {
  initialScheduleData: InitialScheduleData;
  initialCharacterData: InitialCharacterData;
}) {
  const scheduleState = useScheduleEntries({ initialData: initialScheduleData });
  const characterState = useCharacters({ initialData: initialCharacterData });
  const { entries } = scheduleState;
  const { characters: catalogCharacters } = characterState;
  const [now, setNow] = useState(() => new Date());
  const [isClockReady, setIsClockReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => japanDate());
  const today = japanDate(now);
  const currentTime = japanTime(now);
  const todayAppearances = entries
    .filter((entry) => entry.date <= today && (entry.endDate ?? entry.date) >= today)
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
  const timelineStartTimes = Array.from(new Set(selectedSchedules.map((entry) => entry.startTime))).sort();
  const latestTimelineEnd = selectedSchedules
    .map(timelineEndTime)
    .sort()
    .at(-1);
  const timelineSegments = timelineStartTimes.map((startTime, index) => ({
    startTime,
    endTime: timelineStartTimes[index + 1]
      ?? (latestTimelineEnd && latestTimelineEnd > startTime
        ? latestTimelineEnd
        : minutesToTime(timeToMinutes(startTime) + 30)),
  }));
  const timelineRows = [
    ...timelineSegments.map((segment) => {
      const duration = timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime);
      return `minmax(${Math.max(64, duration * 1.8)}px, auto)`;
    }),
  ].join(" ");
  const currentTimeMinutes = timeToMinutes(currentTime);
  const currentTimelinePosition = isClockReady && selectedDate === today && timelineSegments.length > 0
    ? (() => {
        const segmentIndex = timelineSegments.findIndex((segment, index) => {
          const segmentStart = timeToMinutes(segment.startTime);
          const segmentEnd = timeToMinutes(segment.endTime);
          return currentTimeMinutes >= segmentStart && (
            currentTimeMinutes < segmentEnd
            || (index === timelineSegments.length - 1 && currentTimeMinutes === segmentEnd)
          );
        });

        if (segmentIndex >= 0) {
          const segment = timelineSegments[segmentIndex];
          const segmentStart = timeToMinutes(segment.startTime);
          const segmentDuration = timeToMinutes(segment.endTime) - segmentStart;
          return {
            row: segmentIndex + 1,
            offset: ((currentTimeMinutes - segmentStart) / segmentDuration) * 100,
          };
        }

        return currentTimeMinutes < timeToMinutes(timelineSegments[0].startTime)
          ? { row: 1, offset: 0 }
          : { row: timelineSegments.length, offset: 100 };
      })()
    : null;

  useEffect(() => {
    const updateClock = () => {
      setNow(new Date());
      setIsClockReady(true);
    };
    updateClock();
    const timer = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const characters = mergeCharactersWithNames(
    catalogCharacters,
    [...todayAppearances, ...selectedSchedules].flatMap((entry) => getEntryCharacterNames(entry)),
  );

  const characterById = new Map(characters.map((character) => [character.id, character]));

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

  const appearancesForCharacter = (character: Character) => todayAppearances.filter((entry) => (
    entry.characterIds.includes(character.id) || namesForEntry(entry).includes(character.name)
  ));

  const todayCharacterCards = characters
    .map((character) => ({ character, appearances: appearancesForCharacter(character) }))
    .filter(({ appearances }) => appearances.length > 0)
    .sort((left, right) => compareCharacters(left.character, right.character));
  const characterSectionHasData = entries.length > 0 && catalogCharacters.length > 0;
  const characterSectionProblem = !characterSectionHasData && (
    scheduleState.status === "error" || characterState.status === "error"
      ? "error"
      : scheduleState.status === "unavailable" || characterState.status === "unavailable"
        ? "unavailable"
        : null
  );
  const characterSectionLoading = !characterSectionProblem && (
    scheduleState.status === "loading" || characterState.status === "loading"
  );
  const scheduleSectionProblem = entries.length === 0 && (
    scheduleState.status === "error" || scheduleState.status === "unavailable"
      ? scheduleState.status
      : null
  );

  return (
    <>
      <section id="today-characters" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-10 sm:px-6 sm:pt-12 lg:px-8">
        <SectionHeading
          title="今日会えるキャラクター"
          href="/characters"
          linkLabel="キャラクターから探す"
        />
        {characterSectionLoading ? (
          <DataStatePanel state="loading" message="今日会えるキャラクターを読み込んでいます…" />
        ) : characterSectionProblem ? (
          <DataStatePanel
            state={characterSectionProblem}
            message={characterSectionProblem === "unavailable"
              ? "現在、キャラクター情報を表示できません。"
              : "今日会えるキャラクターを読み込めませんでした。"}
            onRetry={() => {
              scheduleState.retry();
              characterState.retry();
            }}
          />
        ) : todayCharacterCards.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {todayCharacterCards.map(({ character }) => (
              <a
                key={character.id}
                href={`/schedule?character=${encodeURIComponent(character.name)}&from=${today}&to=${today}#schedule-results`}
                className="group flex min-h-[68px] items-center gap-2.5 rounded-[18px] border border-pink/10 bg-white p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-card"
              >
                <CharacterAvatar character={character} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black leading-[1.35] text-ink sm:text-[13px]">{character.name}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-pink group-hover:underline">
                    予定を見る <ArrowRight size={11} aria-hidden="true" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-pink/20 bg-white px-4 py-7 text-center text-[12px] font-bold text-ink/50">
            今日の公開済みキャラクター予定はまだありません。
          </p>
        )}
        {!characterSectionLoading && !characterSectionProblem && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold leading-4 text-ink/50">
            <span className="inline-flex items-center gap-1 text-lavender"><Sparkles size={12} aria-hidden="true" />公開済み予定</span>
            <span>取込後に確認・公開した予定を反映します。</span>
            {(scheduleState.isRefreshing || characterState.isRefreshing) && (
              <span className="inline-flex items-center gap-1 text-pink" role="status">
                <LoaderCircle size={11} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                更新中…
              </span>
            )}
          </div>
        )}
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-[12px] font-black text-ink/60">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-pink/10 text-pink"><CalendarDays size={16} aria-hidden="true" /></span>
                確認したい日を選択
              </div>
              <Link href={`/plan?date=${selectedDate}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-[10px] font-black text-white">
                <ClipboardList size={13} aria-hidden="true" />
                マイプランを見る
              </Link>
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
          {scheduleState.status === "loading" ? (
            <DataStatePanel state="loading" message="スケジュールを読み込んでいます…" />
          ) : scheduleSectionProblem ? (
            <DataStatePanel
              state={scheduleSectionProblem}
              message={scheduleSectionProblem === "unavailable"
                ? "現在、スケジュール情報を表示できません。"
                : "スケジュールを読み込めませんでした。"}
              onRetry={scheduleState.retry}
            />
          ) : timelineStartTimes.length > 0 ? (
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
              <p className="border-b border-pink/10 bg-white px-3 py-2 text-center text-[9px] font-bold text-ink/45 sm:text-[10px]">
                予定を選択してマイプランに追加
              </p>

              <div
                className="relative grid grid-cols-[38px_minmax(0,1.1fr)_minmax(0,.9fr)] px-2 pb-5 pt-4 sm:grid-cols-[64px_minmax(0,1.25fr)_minmax(0,.75fr)] sm:px-4 sm:pb-6"
                style={{ gridTemplateRows: timelineRows }}
              >
                {timelineStartTimes.map((startTime, index) => (
                  <div key={startTime} className="contents">
                    <div
                      className={`pointer-events-none z-0 border-t ${startTime.endsWith(":00") ? "border-pink/20" : "border-dashed border-ink/10"}`}
                      style={{ gridColumn: "2 / -1", gridRow: String(index + 1) }}
                      aria-hidden="true"
                    />
                    <div
                      className="relative z-[1] border-r border-pink/20 text-right"
                      style={{ gridColumn: "1", gridRow: String(index + 1) }}
                    >
                      <time className="absolute right-2 top-0 -translate-y-1/2 text-[10px] font-black leading-none tabular-nums text-ink/65 sm:right-3 sm:text-[13px]">{startTime}</time>
                      <span className="absolute -right-[4px] top-0 h-[7px] w-[7px] -translate-y-1/2 rounded-full border-2 border-white bg-pink" aria-hidden="true" />
                    </div>
                  </div>
                ))}

                {currentTimelinePosition && (
                  <div
                    className="pointer-events-none relative z-20"
                    style={{ gridColumn: "1 / -1", gridRow: String(currentTimelinePosition.row) }}
                  >
                    <div
                      className="absolute inset-x-0 flex -translate-y-1/2 items-center"
                      style={{ top: `${currentTimelinePosition.offset}%` }}
                    >
                      <time
                        dateTime={currentTime}
                        aria-label={`現在時刻 ${currentTime}`}
                        className="shrink-0 rounded-full bg-[#e5487e] px-1.5 py-1 text-[9px] font-black leading-none tabular-nums text-white shadow-sm sm:text-[10px]"
                      >
                        <span className="hidden sm:inline">現在 </span>{currentTime}
                      </time>
                      <span className="relative h-0 flex-1 border-t-2 border-[#e5487e] shadow-[0_1px_2px_rgba(229,72,126,0.35)]" aria-hidden="true">
                        <span className="absolute -right-0.5 -top-[4px] h-1.5 w-1.5 rounded-full bg-[#e5487e]" />
                      </span>
                    </div>
                  </div>
                )}

                {timelineStartTimes.map((startTime, index) => {
                  const row = index + 1;
                  const startEventGroups = eventGroups.filter((group) => group.startTime === startTime);
                  const startFanStudioGroups = fanStudioGroups.filter((group) => group.startTime === startTime);
                  return (
                    <div key={startTime} className="contents">
                      <div className="z-10 px-1.5 py-3 sm:px-2 sm:py-4" style={{ gridColumn: "2", gridRow: String(row) }}>
                        <div className="grid gap-1.5">
                          {startEventGroups.map((group) => {
                            const status = commonGroupStatus(group.entries, today, currentTime);
                            return (
                              <article key={group.key} className={`min-w-0 overflow-hidden rounded-xl border border-[#eed8aa] bg-[#fffdfa] ${status?.label === "終了" ? "saturate-50" : ""}`}>
                                <header className="flex min-h-8 items-center justify-between gap-1 border-b border-[#eed8aa] bg-[#fff4df] px-2 py-1.5 sm:px-3">
                                  <time className="min-w-0 truncate text-[9px] font-black tabular-nums text-[#a76624] sm:text-[12px]">
                                    {group.startTime}–{group.endTime}
                                  </time>
                                  <span className="flex shrink-0 items-center gap-1">
                                    {status && <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black sm:text-[9px] ${status.className}`}>{status.label}</span>}
                                    {group.entries.length > 1 && <span className="text-[8px] font-black text-[#a76624] sm:text-[9px]">{group.entries.length}件</span>}
                                  </span>
                                </header>
                                <div className="divide-y divide-[#eed8aa]/60">
                                  {group.entries.map((entry) => {
                                    const names = namesForEntry(entry);
                                    const compactTitle = entry.title.length > 18;
                                    return (
                                      <PlanToggleSurface
                                        key={entry.id}
                                        entry={entry}
                                        targetDate={selectedDate}
                                        className="group/plan block w-full px-2 py-2 text-left transition-[background-color,box-shadow,transform] hover:bg-[#fff7e9] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d9912d]/35 sm:px-3 sm:py-2.5"
                                        addedClassName="bg-mint/10"
                                        pressedClassName="scale-[0.99] bg-[#fff0d6] shadow-inner"
                                      >
                                        {({ added, pressed }) => (
                                          <>
                                            <span className="grid grid-cols-[minmax(0,1fr)_16px] items-start gap-1.5">
                                              <span className={`min-w-0 font-black leading-[1.35] text-ink [overflow-wrap:anywhere] ${compactTitle ? "text-[9px] tracking-[-0.02em] sm:text-[12px]" : "text-[10px] sm:text-[13px]"}`}>
                                                {entry.title}
                                              </span>
                                              <PlanToggleIndicator
                                                added={added}
                                                pressed={pressed}
                                                size={15}
                                                className={`mt-0.5 ${added ? "text-[#35745f]" : "text-[#b86d1f]"}`}
                                              />
                                            </span>
                                            {names.length > 0 && <span className="mt-1 block text-[9px] font-bold leading-4 text-pink sm:text-[11px]">{names.join("・")}</span>}
                                            <span className="mt-1 flex min-w-0 items-center gap-1 text-[8px] font-bold leading-4 text-ink/45 sm:text-[10px]">
                                              <MapPin size={10} className="shrink-0" aria-hidden="true" />
                                              <span className="truncate">{entry.location}</span>
                                            </span>
                                          </>
                                        )}
                                      </PlanToggleSurface>
                                    );
                                  })}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>

                      <div className="z-10 px-1.5 py-3 sm:px-2 sm:py-4" style={{ gridColumn: "3", gridRow: String(row) }}>
                        <div className="grid gap-1.5">
                          {startFanStudioGroups.map((group) => {
                            const status = commonGroupStatus(group.entries, today, currentTime);
                            return (
                              <article key={group.key} className={`min-w-0 overflow-hidden rounded-xl border border-lavender/25 bg-[#fbfaff] ${status?.label === "終了" ? "saturate-50" : ""}`}>
                                <header className="flex min-h-8 items-center justify-between gap-1 border-b border-lavender/20 bg-lavender/10 px-2 py-1.5 sm:px-2.5">
                                  <time className="min-w-0 truncate text-[9px] font-black tabular-nums text-lavender sm:text-[11px]">
                                    {group.startTime}–{group.endTime}
                                  </time>
                                  <span className="flex shrink-0 items-center gap-1">
                                    {status && <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${status.className}`}>{status.label}</span>}
                                    {group.entries.length > 1 && <span className="text-[8px] font-black text-lavender sm:text-[9px]">{group.entries.length}件</span>}
                                  </span>
                                </header>
                                <div className="divide-y divide-lavender/15">
                                  {group.entries.map((entry) => {
                                    const names = namesForEntry(entry);
                                    const appearance = specialAppearance(entry);
                                    const displayName = names.length > 0
                                      ? names.join("・")
                                      : fanStudioFallbackName(entry);
                                    return (
                                      <PlanToggleSurface
                                        key={entry.id}
                                        entry={entry}
                                        targetDate={selectedDate}
                                        className="group/plan block w-full px-2 py-2 text-left transition-[background-color,box-shadow,transform] hover:bg-lavender/5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lavender/35 sm:px-2.5"
                                        addedClassName="bg-mint/10"
                                        pressedClassName="scale-[0.99] bg-lavender/10 shadow-inner"
                                      >
                                        {({ added, pressed }) => (
                                          <>
                                            <span className="grid grid-cols-[minmax(0,1fr)_16px] items-start gap-1">
                                              <span className="min-w-0 text-[10px] font-black leading-[1.35] text-ink [overflow-wrap:anywhere] sm:text-[12px]">{displayName}</span>
                                              <PlanToggleIndicator
                                                added={added}
                                                pressed={pressed}
                                                size={14}
                                                className={added ? "text-[#35745f]" : "text-lavender"}
                                              />
                                            </span>
                                            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[8px] font-bold leading-4 text-ink/45 sm:text-[9px]">
                                              <span className="truncate">{shortFanStudioLocation(entry.location)}</span>
                                              {appearance && (
                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f6b83f]/15 px-1.5 py-0.5 text-[8px] font-black leading-3 text-[#9a6512]">
                                                  <Sun size={9} aria-hidden="true" />{appearance}
                                                </span>
                                              )}
                                            </span>
                                          </>
                                        )}
                                      </PlanToggleSurface>
                                    );
                                  })}
                                </div>
                              </article>
                            );
                          })}
                        </div>
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
          {scheduleState.status !== "loading" && !scheduleSectionProblem && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
              {scheduleState.isRefreshing
                ? <LoaderCircle size={13} className="animate-spin text-pink motion-reduce:animate-none" aria-hidden="true" />
                : <Clock3 size={13} aria-hidden="true" />}
              {scheduleState.isRefreshing ? "更新中…" : `最終更新：${displayUpdatedAt(latestUpdatedAt)}`}
              <span className="text-ink/20">|</span>
              {selectedSchedules.some((entry) => entry.isImported) ? "公式参照データ" : "公開データ"}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
