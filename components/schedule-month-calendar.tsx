"use client";

import { useEffect, useMemo, useState } from "react";
import { CakeSlice, CalendarX2, ChevronLeft, ChevronRight, PartyPopper, Sparkles } from "lucide-react";
import type { CharacterBirthdayOccurrence } from "@/lib/character-birthday";
import {
  buildScheduleCalendarMonth,
  getScheduleCalendarMonthKeys,
  type ScheduleCalendarMonth,
} from "@/lib/schedule-calendar";
import { isFanStudioGreeting } from "@/lib/schedule-display";
import type { ScheduleEntry } from "@/lib/schedule-store";
import type { ParkOperatingDay } from "@/lib/park-operating-day-store";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type CalendarPreview = {
  key: string;
  label: string;
  kind: "birthday" | "event" | "fan-studio" | "closed";
};

function entriesForDate(entries: ScheduleEntry[], date: string) {
  return entries.filter((entry) => entry.date <= date && (entry.endDate ?? entry.date) >= date);
}

function previewItems(
  entries: ScheduleEntry[],
  birthdays: CharacterBirthdayOccurrence[],
): CalendarPreview[] {
  const birthdayNames = birthdays.map(({ character }) => character.name);
  const eventTitles = Array.from(new Set(
    entries.filter((entry) => !isFanStudioGreeting(entry)).map((entry) => entry.title),
  ));
  const previews: CalendarPreview[] = [];

  if (birthdayNames.length > 0) {
    previews.push({
      key: "birthday",
      label: `${birthdayNames.join("・")} 誕生日`,
      kind: "birthday",
    });
  }
  eventTitles.forEach((title) => previews.push({ key: `event:${title}`, label: title, kind: "event" }));
  if (entries.some(isFanStudioGreeting)) {
    previews.push({ key: "fan-studio", label: "ファンスタジオ", kind: "fan-studio" });
  }
  return previews;
}

function previewClassName(kind: CalendarPreview["kind"]) {
  if (kind === "closed") return "bg-[#fff0f5] text-pink";
  if (kind === "birthday") return "bg-pink/10 text-pink";
  if (kind === "fan-studio") return "bg-lavender/10 text-lavender";
  return "bg-[#fff2d8] text-[#966023]";
}

function PreviewIcon({ kind }: { kind: CalendarPreview["kind"] }) {
  if (kind === "closed") return <CalendarX2 size={10} aria-hidden="true" />;
  if (kind === "birthday") return <CakeSlice size={10} aria-hidden="true" />;
  if (kind === "fan-studio") return <Sparkles size={10} aria-hidden="true" />;
  return <PartyPopper size={10} aria-hidden="true" />;
}

function MoreCount({ count, className }: { count: number; className: string }) {
  return (
    <span className={`inline-flex items-center gap-px whitespace-nowrap text-[8px] font-black text-ink/35 lg:text-[9px] ${className}`}>
      <span className="sr-only">ほか{count}件</span>
      <span aria-hidden="true">ほか</span>
      <span
        aria-hidden="true"
        className="grid h-3.5 min-w-3.5 place-items-center rounded-full bg-pink px-0.5 text-[7px] leading-none text-white lg:h-4 lg:min-w-4 lg:text-[8px]"
      >
        {count}
      </span>
      <span aria-hidden="true">件</span>
    </span>
  );
}

function MonthPanel({
  month,
  entries,
  birthdays,
  operatingDaysByDate,
  today,
  onSelectDate,
}: {
  month: ScheduleCalendarMonth;
  entries: ScheduleEntry[];
  birthdays: CharacterBirthdayOccurrence[];
  operatingDaysByDate: Map<string, ParkOperatingDay>;
  today: string;
  onSelectDate: (date: string) => void;
}) {
  const targetDayCount = month.dates.filter(({ isInMonth, isInRange }) => isInMonth && isInRange).length;

  return (
    <section className="overflow-hidden rounded-[20px] border border-pink/15 bg-white shadow-[0_10px_30px_rgba(96,64,79,0.06)]" aria-label={`${month.label}のカレンダー`}>
      <div className="flex items-end justify-between gap-3 px-3.5 py-3 sm:px-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.14em] text-pink">MONTHLY SCHEDULE</p>
          <h3 className="mt-0.5 text-[17px] font-black text-ink sm:text-[19px]">{month.label}</h3>
        </div>
        <span className="text-[10px] font-black text-ink/35">対象{targetDayCount}日</span>
      </div>

      <div className="grid grid-cols-7 border-y border-pink/10 bg-[#fff9fb]" aria-hidden="true">
        {WEEKDAYS.map((weekday, index) => (
          <span key={weekday} className={`py-1.5 text-center text-[10px] font-black sm:text-[11px] ${index === 0 ? "text-pink" : index === 6 ? "text-sky" : "text-ink/45"}`}>
            {weekday}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-pink/[0.08]">
        {month.dates.map((calendarDate, index) => {
          const selectable = calendarDate.isInMonth && calendarDate.isInRange;
          const dateEntries = selectable ? entriesForDate(entries, calendarDate.date) : [];
          const dateBirthdays = selectable ? birthdays.filter(({ date }) => date === calendarDate.date) : [];
          const operatingDay = selectable ? operatingDaysByDate.get(calendarDate.date) : undefined;
          const previews = [
            ...(operatingDay?.operatingStatus === "closed"
              ? [{ key: "closed", label: "休園日", kind: "closed" as const }]
              : []),
            ...previewItems(dateEntries, dateBirthdays),
          ];
          const weekdayIndex = index % 7;
          const isToday = calendarDate.date === today;
          const fullDateLabel = new Intl.DateTimeFormat("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          }).format(new Date(`${calendarDate.date}T12:00:00`));
          const summary = [
            operatingDay?.operatingStatus === "closed" ? "休園日" : "",
            dateBirthdays.length > 0 ? `誕生日${dateBirthdays.length}件` : "",
            dateEntries.length > 0 ? `予定${dateEntries.length}件` : "予定なし",
          ].filter(Boolean).join("、");

          return (
            <button
              key={calendarDate.date}
              type="button"
              disabled={!selectable}
              onClick={() => onSelectDate(calendarDate.date)}
              aria-label={selectable ? `${fullDateLabel}、${summary}を表示` : `${fullDateLabel}、検索対象外`}
              className={`relative flex h-[66px] min-w-0 flex-col border-b border-r border-pink/[0.08] px-1 py-1.5 text-left transition-colors sm:h-[76px] lg:h-[116px] lg:px-1.5 lg:py-2 ${
                selectable
                  ? "bg-white hover:z-10 hover:bg-[#fff8fb] focus-visible:z-20"
                  : "cursor-default bg-[#fbf9fa] text-ink/20"
              }`}
            >
              {isToday && selectable && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-[1px] rounded-lg border-2 border-pink" />
              )}

              <span className={`grid h-5 min-w-5 place-items-center self-start rounded-full px-1 text-[10px] font-black sm:text-[11px] ${
                !calendarDate.isInMonth
                  ? "text-ink/15"
                  : weekdayIndex === 0
                      ? "text-pink"
                      : weekdayIndex === 6
                        ? "text-sky"
                        : selectable ? "text-ink/75" : "text-ink/25"
              }`}>
                {calendarDate.day}
              </span>

              {selectable && previews.length > 0 && (
                <span className="mt-0.5 grid min-w-0 gap-0.5 lg:mt-1">
                  {previews.slice(0, 3).map((preview, previewIndex) => (
                    <span
                      key={preview.key}
                      className={`flex min-w-0 items-center gap-0.5 rounded-[4px] px-1 py-0.5 text-[8px] font-black leading-[1.15] lg:text-[9px] ${previewIndex > 0 ? "hidden lg:flex" : ""} ${previewClassName(preview.kind)}`}
                    >
                      <span className="hidden shrink-0 xl:inline"><PreviewIcon kind={preview.kind} /></span>
                      <span className="truncate">{preview.label}</span>
                    </span>
                  ))}
                </span>
              )}

              {selectable && previews.length > 1 && (
                <MoreCount count={previews.length - 1} className="mt-auto self-end lg:hidden" />
              )}
              {selectable && previews.length > 3 && (
                <MoreCount count={previews.length - 3} className="mt-auto hidden self-end lg:inline-flex" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ScheduleMonthCalendar({
  fromDate,
  toDate,
  entries,
  birthdays,
  operatingDays,
  today,
  onSelectDate,
}: {
  fromDate: string;
  toDate: string;
  entries: ScheduleEntry[];
  birthdays: CharacterBirthdayOccurrence[];
  operatingDays: ParkOperatingDay[];
  today: string;
  onSelectDate: (date: string) => void;
}) {
  const months = useMemo(() => getScheduleCalendarMonthKeys(fromDate, toDate)
    .map((key) => buildScheduleCalendarMonth(key, fromDate, toDate))
    .filter((month): month is ScheduleCalendarMonth => month !== null), [fromDate, toDate]);
  const [activeIndex, setActiveIndex] = useState(0);
  const operatingDaysByDate = useMemo(
    () => new Map(operatingDays.map((entry) => [entry.date, entry])),
    [operatingDays],
  );

  useEffect(() => setActiveIndex(0), [fromDate, toDate]);

  if (months.length === 0) {
    return <div className="rounded-[24px] border border-dashed border-pink/25 bg-white p-10 text-center"><p className="font-black text-ink">表示期間を確認してください</p></div>;
  }

  const mobileMonth = months[Math.min(activeIndex, months.length - 1)];
  const desktopStartIndex = Math.min(activeIndex, Math.max(months.length - 2, 0));
  const desktopMonths = months.slice(desktopStartIndex, desktopStartIndex + 2);
  const moveMobile = (amount: number) => setActiveIndex((current) => Math.max(0, Math.min(current + amount, months.length - 1)));
  const moveDesktop = (amount: number) => setActiveIndex((current) => Math.max(0, Math.min(current + amount, Math.max(months.length - 2, 0))));

  return (
    <div>
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-pink/10 bg-white px-2.5 py-2 shadow-[0_6px_20px_rgba(96,64,79,0.04)]">
        <p className="pl-1 text-[11px] font-black text-ink/50">
          対象月 <span className="ml-1 text-pink">{months.length}か月</span>
        </p>

        {months.length > 1 && (
          <div className="flex items-center gap-1 lg:hidden">
            <button type="button" onClick={() => moveMobile(-1)} disabled={activeIndex === 0} aria-label="前の月" className="grid h-9 w-9 place-items-center rounded-xl text-pink transition-colors hover:bg-pink/5 disabled:text-ink/15"><ChevronLeft size={17} aria-hidden="true" /></button>
            <span className="min-w-[86px] text-center text-[11px] font-black text-ink/60">{mobileMonth.label}</span>
            <button type="button" onClick={() => moveMobile(1)} disabled={activeIndex >= months.length - 1} aria-label="次の月" className="grid h-9 w-9 place-items-center rounded-xl text-pink transition-colors hover:bg-pink/5 disabled:text-ink/15"><ChevronRight size={17} aria-hidden="true" /></button>
          </div>
        )}

        {months.length > 2 && (
          <div className="hidden items-center gap-1 lg:flex">
            <button type="button" onClick={() => moveDesktop(-2)} disabled={desktopStartIndex === 0} aria-label="前の2か月" className="grid h-9 w-9 place-items-center rounded-xl text-pink transition-colors hover:bg-pink/5 disabled:text-ink/15"><ChevronLeft size={17} aria-hidden="true" /></button>
            <span className="min-w-[150px] text-center text-[11px] font-black text-ink/60">{desktopMonths.map(({ label }) => label).join("・")}</span>
            <button type="button" onClick={() => moveDesktop(2)} disabled={desktopStartIndex >= months.length - 2} aria-label="次の2か月" className="grid h-9 w-9 place-items-center rounded-xl text-pink transition-colors hover:bg-pink/5 disabled:text-ink/15"><ChevronRight size={17} aria-hidden="true" /></button>
          </div>
        )}
      </div>

      <div className="lg:hidden">
        <MonthPanel month={mobileMonth} entries={entries} birthdays={birthdays} operatingDaysByDate={operatingDaysByDate} today={today} onSelectDate={onSelectDate} />
      </div>
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {desktopMonths.map((month) => <MonthPanel key={month.key} month={month} entries={entries} birthdays={birthdays} operatingDaysByDate={operatingDaysByDate} today={today} onSelectDate={onSelectDate} />)}
      </div>
    </div>
  );
}
