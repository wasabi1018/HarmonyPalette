"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, PartyPopper, Sparkles, Sun } from "lucide-react";
import type { Character } from "@/data/types";
import { sortCharacterNames } from "@/lib/character-store";
import {
  fanStudioFallbackName,
  isFanStudioGreeting,
  shortFanStudioLocation,
  specialAppearance,
} from "@/lib/schedule-display";
import { getEntryCharacterNames, type ScheduleEntry } from "@/lib/schedule-store";
import { PlanToggleIndicator, PlanToggleSurface } from "@/components/plan-add-button";

function todayInJapan(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function timeInJapan(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date).replace("：", ":");
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  const safeMinutes = Math.min(Math.max(minutes, 0), (23 * 60) + 59);
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

function entryStatus(entry: ScheduleEntry, today: string, currentTime: string) {
  const entryEndDate = entry.endDate ?? entry.date;
  if (
    entryEndDate < today
    || entry.status === "completed"
    || (entryEndDate === today && entry.endTime && entry.endTime <= currentTime)
  ) {
    return { label: "終了", className: "bg-ink/5 text-ink/45" };
  }
  if (entry.date <= today && entryEndDate >= today && entry.startTime <= currentTime) {
    return { label: "進行中", className: "bg-mint/15 text-[#35745f]" };
  }
  return null;
}

function commonGroupStatus(entries: ScheduleEntry[], today: string, currentTime: string) {
  const statuses = entries.map((entry) => entryStatus(entry, today, currentTime));
  const first = statuses[0];
  if (!first) return null;
  return statuses.every((status) => status?.label === first.label) ? first : null;
}

export function ScheduleTimeline({
  entries,
  date,
  characters = [],
  selectedCharacters = [],
  className = "",
}: {
  entries: ScheduleEntry[];
  date: string;
  characters?: Character[];
  selectedCharacters?: string[];
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const [isClockReady, setIsClockReady] = useState(false);
  const today = todayInJapan(now);
  const currentTime = timeInJapan(now);
  const selectedCharacterSet = useMemo(() => new Set(selectedCharacters), [selectedCharacters]);
  const schedules = useMemo(() => [...entries].sort((left, right) => (
    `${left.startTime}-${left.title}`.localeCompare(`${right.startTime}-${right.title}`, "ja")
  )), [entries]);
  const eventGroups = useMemo(() => (
    groupTimelineEntries(schedules.filter((entry) => !isFanStudioGreeting(entry)))
  ), [schedules]);
  const fanStudioGroups = useMemo(() => (
    groupTimelineEntries(schedules.filter(isFanStudioGreeting)).map((group) => ({
      ...group,
      entries: [...group.entries].sort((left, right) => left.location.localeCompare(right.location, "ja")),
    }))
  ), [schedules]);
  const timelineStartTimes = useMemo(() => (
    Array.from(new Set(schedules.map((entry) => entry.startTime))).sort()
  ), [schedules]);
  const latestTimelineEnd = schedules.map(timelineEndTime).sort().at(-1);
  const timelineSegments = timelineStartTimes.map((startTime, index) => ({
    startTime,
    endTime: timelineStartTimes[index + 1]
      ?? (latestTimelineEnd && latestTimelineEnd > startTime
        ? latestTimelineEnd
        : minutesToTime(timeToMinutes(startTime) + 30)),
  }));
  const timelineRows = timelineSegments.map((segment) => {
    const duration = timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime);
    return `minmax(${Math.max(64, duration * 1.8)}px, auto)`;
  }).join(" ");
  const currentTimeMinutes = timeToMinutes(currentTime);
  const currentTimelinePosition = isClockReady && date === today && timelineSegments.length > 0
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

  const namesForEntry = (entry: ScheduleEntry) => (
    sortCharacterNames(getEntryCharacterNames(entry), characters)
  );

  if (timelineStartTimes.length === 0) return null;

  return (
    <div className={`overflow-hidden rounded-[18px] border border-pink/10 bg-white shadow-[0_8px_24px_rgba(118,73,86,0.05)] ${className}`}>
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
                                targetDate={date}
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
                                    {names.length > 0 && (
                                      <span className="mt-1 block text-[9px] font-bold leading-4 text-pink sm:text-[11px]">
                                        {names.map((name, nameIndex) => (
                                          <span key={name} className={selectedCharacterSet.has(name) ? "rounded bg-pink/10 px-0.5 font-black" : undefined}>
                                            {nameIndex > 0 && "・"}{name}
                                          </span>
                                        ))}
                                      </span>
                                    )}
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
                                targetDate={date}
                                className="group/plan block w-full px-2 py-2 text-left transition-[background-color,box-shadow,transform] hover:bg-lavender/5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lavender/35 sm:px-2.5"
                                addedClassName="bg-mint/10"
                                pressedClassName="scale-[0.99] bg-lavender/10 shadow-inner"
                              >
                                {({ added, pressed }) => (
                                  <>
                                    <span className="grid grid-cols-[minmax(0,1fr)_16px] items-start gap-1">
                                      <span className={`min-w-0 text-[10px] font-black leading-[1.35] text-ink [overflow-wrap:anywhere] sm:text-[12px] ${selectedCharacterSet.has(displayName) ? "text-pink" : ""}`}>{displayName}</span>
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
  );
}
