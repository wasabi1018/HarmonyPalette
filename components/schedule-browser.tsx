"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CakeSlice, CalendarDays, Check, ChevronDown, Clock3, Filter, LayoutList, LoaderCircle, MapPin, RotateCcw, Search, SlidersHorizontal, Sparkles, Sun, X } from "lucide-react";
import type { Character } from "@/data/types";
import { DataStatePanel } from "@/components/data-state-panel";
import { ScheduleEntryCard } from "@/components/schedule-entry-card";
import { ScheduleMonthCalendar } from "@/components/schedule-month-calendar";
import { PlanToggleIndicator, PlanToggleSurface } from "@/components/plan-add-button";
import { getCharacterBirthdaysInRange, type CharacterBirthdayOccurrence } from "@/lib/character-birthday";
import { type InitialCharacterData, sortCharacterNames, useCharacters } from "@/lib/character-store";
import { fanStudioFallbackName, isFanStudioGreeting, shortFanStudioLocation, specialAppearance } from "@/lib/schedule-display";
import { getEntryCharacterNames, type InitialScheduleData, type ScheduleEntry, useScheduleEntries } from "@/lib/schedule-store";

type MatchMode = "any" | "all";
type Period = "all" | "7" | "14" | "30";
type ViewMode = "list" | "calendar";
const FAN_STUDIO_EVENT = "ファンスタジオ";
const BIRTHDAY_EVENT = "キャラクターの誕生日";

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatGroupDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" })
    .format(new Date(`${date}T00:00:00`));
}

function getDisplayDate(entry: ScheduleEntry, fromDate: string) {
  return entry.kind === "event" && entry.date < fromDate ? fromDate : entry.date;
}

export function ScheduleBrowser({
  initialCharacters = [],
  initialEvents = [],
  initialFromDate,
  initialToDate,
  initialView = "calendar",
  initialScheduleData,
  initialCharacterData,
}: {
  initialCharacters?: string[];
  initialEvents?: string[];
  initialFromDate?: string;
  initialToDate?: string;
  initialView?: ViewMode;
  initialScheduleData: InitialScheduleData;
  initialCharacterData: InitialCharacterData;
}) {
  const scheduleState = useScheduleEntries({ initialData: initialScheduleData });
  const characterState = useCharacters({ initialData: initialCharacterData });
  const { entries } = scheduleState;
  const { characters } = characterState;
  const today = useMemo(todayInJapan, []);
  const hasInitialDateRange = Boolean(initialFromDate || initialToDate);
  const [fromDate, setFromDate] = useState(initialFromDate ?? today);
  const [toDate, setToDate] = useState(initialToDate ?? (initialFromDate ? initialFromDate : addDays(today, 13)));
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(initialCharacters);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(initialEvents);
  const [matchMode, setMatchMode] = useState<MatchMode>("any");
  const [location, setLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [sortAscending, setSortAscending] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [calendarDialogDate, setCalendarDialogDate] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period | "custom">(hasInitialDateRange ? "custom" : "14");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const closeCalendarDialog = useCallback(() => setCalendarDialogDate(null), []);

  const bounds = useMemo(() => {
    const dates = entries.flatMap((entry) => [entry.date, entry.endDate ?? entry.date]).sort();
    return { min: dates[0] ?? today, max: dates.at(-1) ?? today };
  }, [entries, today]);
  const locations = useMemo(() => Array.from(new Set(entries.map((entry) => entry.location))).sort((a, b) => a.localeCompare(b, "ja")), [entries]);
  const characterOptions = useMemo(() => sortCharacterNames([
    ...characters.map((character) => character.name),
    ...entries.flatMap((entry) => getEntryCharacterNames(entry)),
  ], characters), [characters, entries]);
  const eventOptions = useMemo(() => [
    BIRTHDAY_EVENT,
    FAN_STUDIO_EVENT,
    ...Array.from(new Set(
      entries
        .filter((entry) => !isFanStudioGreeting(entry))
        .map((entry) => entry.title)
        .filter(Boolean),
    )).sort((a, b) => a.localeCompare(b, "ja")),
  ], [entries]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("character");
    selectedCharacters.forEach((name) => url.searchParams.append("character", name));
    url.searchParams.delete("event");
    selectedEvents.forEach((name) => url.searchParams.append("event", name));
    url.searchParams.set("from", fromDate);
    url.searchParams.set("to", toDate);
    if (viewMode === "list") url.searchParams.set("view", "list");
    else url.searchParams.delete("view");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [fromDate, selectedCharacters, selectedEvents, toDate, viewMode]);

  useEffect(() => {
    if (calendarDialogDate && (calendarDialogDate < fromDate || calendarDialogDate > toDate)) {
      setCalendarDialogDate(null);
    }
  }, [calendarDialogDate, fromDate, toDate]);

  const filteredEntries = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ja");
    const candidates = entries.filter((entry) => {
      const entryEnd = entry.endDate ?? entry.date;
      const matchesDate = entry.date <= toDate && entryEnd >= fromDate;
      const entryCharacterNames = getEntryCharacterNames(entry);
      const matchesLocation = location === "all" || entry.location === location;
      const matchesSelectedEvent = selectedEvents.length === 0
        || (isFanStudioGreeting(entry)
          ? selectedEvents.includes(FAN_STUDIO_EVENT)
          : selectedEvents.includes(entry.title));
      const matchesQuery = keyword === "" || `${entry.title}${entry.location}${entry.scheduleType}${entryCharacterNames.join("")}`.toLocaleLowerCase("ja").includes(keyword);
      return matchesDate && matchesLocation && matchesSelectedEvent && matchesQuery;
    });

    let characterMatchedEntries = candidates;
    if (selectedCharacters.length > 0 && matchMode === "any") {
      characterMatchedEntries = candidates.filter((entry) => {
        const entryCharacterNames = getEntryCharacterNames(entry);
        return selectedCharacters.some((name) => entryCharacterNames.includes(name));
      });
    } else if (selectedCharacters.length > 0) {
      const charactersByDate = new Map<string, Set<string>>();
      candidates.forEach((entry) => {
        const displayDate = getDisplayDate(entry, fromDate);
        const names = charactersByDate.get(displayDate) ?? new Set<string>();
        getEntryCharacterNames(entry).forEach((name) => names.add(name));
        charactersByDate.set(displayDate, names);
      });
      const matchingDates = new Set(Array.from(charactersByDate.entries())
        .filter(([, names]) => selectedCharacters.every((name) => names.has(name)))
        .map(([date]) => date));

      characterMatchedEntries = candidates.filter((entry) => {
        const displayDate = getDisplayDate(entry, fromDate);
        const entryCharacterNames = getEntryCharacterNames(entry);
        return matchingDates.has(displayDate)
          && selectedCharacters.some((name) => entryCharacterNames.includes(name));
      });
    }

    return characterMatchedEntries.sort((a, b) => {
      const result = `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`);
      return sortAscending ? result : -result;
    });
  }, [entries, fromDate, location, matchMode, query, selectedCharacters, selectedEvents, sortAscending, toDate]);

  const birthdayOccurrences = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate) || fromDate > toDate) return [];
    if (selectedEvents.length > 0 && !selectedEvents.includes(BIRTHDAY_EVENT)) return [];

    const keyword = query.trim().toLocaleLowerCase("ja");
    return getCharacterBirthdaysInRange(characters, fromDate, toDate).filter(({ character }) => {
      const matchesCharacter = selectedCharacters.length === 0 || selectedCharacters.includes(character.name);
      const matchesQuery = keyword === "" || `${character.name}誕生日`.toLocaleLowerCase("ja").includes(keyword);
      return matchesCharacter && matchesQuery;
    });
  }, [characters, fromDate, query, selectedCharacters, selectedEvents, toDate]);

  const birthdaysByDate = useMemo(() => {
    const grouped = new Map<string, CharacterBirthdayOccurrence[]>();
    birthdayOccurrences.forEach((birthday) => {
      grouped.set(birthday.date, [...(grouped.get(birthday.date) ?? []), birthday]);
    });
    return grouped;
  }, [birthdayOccurrences]);

  const groups = useMemo(() => {
    const grouped = new Map<string, typeof filteredEntries>();
    filteredEntries.forEach((entry) => {
      const displayDate = getDisplayDate(entry, fromDate);
      grouped.set(displayDate, [...(grouped.get(displayDate) ?? []), entry]);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => sortAscending ? a.localeCompare(b) : b.localeCompare(a));
  }, [filteredEntries, fromDate, sortAscending]);

  const entriesByDate = useMemo(() => new Map(groups), [groups]);
  const listDates = useMemo(() => Array.from(new Set([
    ...groups.map(([date]) => date),
    ...birthdayOccurrences.map(({ date }) => date),
  ])).sort((left, right) => sortAscending ? left.localeCompare(right) : right.localeCompare(left)), [birthdayOccurrences, groups, sortAscending]);

  const reset = () => {
    setFromDate(today);
    setToDate(addDays(today, 13));
    setSelectedCharacters([]);
    setSelectedEvents([]);
    setMatchMode("any");
    setLocation("all");
    setQuery("");
    setSortAscending(true);
    setCalendarDialogDate(null);
    setActivePeriod("14");
    setAdvancedFiltersOpen(false);
  };
  const applyPeriod = (period: Period) => {
    setActivePeriod(period);
    if (period === "all") {
      setFromDate(bounds.min);
      setToDate(bounds.max);
      return;
    }
    setFromDate(today);
    setToDate(addDays(today, Number(period) - 1));
  };

  const isInitialLoading = scheduleState.status === "loading" || characterState.status === "loading";
  const loadProblem = entries.length === 0 && (
    scheduleState.status === "error" || characterState.status === "error"
      ? "error"
      : scheduleState.status === "unavailable" || characterState.status === "unavailable"
        ? "unavailable"
        : null
  );
  const activeAdvancedFilterCount = [
    matchMode !== "any",
    location !== "all",
    activePeriod !== "14" && activePeriod !== "custom",
    query.trim() !== "",
  ].filter(Boolean).length;
  const resultSummary = birthdayOccurrences.length > 0
    ? `予定${filteredEntries.length}件・誕生日${birthdayOccurrences.length}件`
    : `${filteredEntries.length}件`;
  const calendarDialogEntries = calendarDialogDate
    ? filteredEntries.filter((entry) => entry.date <= calendarDialogDate && (entry.endDate ?? entry.date) >= calendarDialogDate)
    : [];
  const calendarDialogBirthdays = calendarDialogDate
    ? birthdaysByDate.get(calendarDialogDate) ?? []
    : [];

  return (
    <div className="mt-5">
      <section className="rounded-[24px] border border-pink/10 bg-white p-4 shadow-soft sm:p-5" aria-label="検索条件">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-pink" aria-hidden="true" /><h2 className="text-[16px] font-black text-ink">スケジュールを絞り込む</h2></div>
          <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-black text-pink hover:bg-pink/5"><RotateCcw size={14} aria-hidden="true" />リセット</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MultiSelectField
            label="キャラクター"
            dialogLabel="キャラクターを選択"
            allLabel="すべてのキャラクター"
            options={characterOptions}
            selected={selectedCharacters}
            onChange={setSelectedCharacters}
            className="md:col-span-2 xl:col-span-2"
          />
          <MultiSelectField
            label="表示するイベント"
            dialogLabel="表示するイベントを選択"
            allLabel="すべてのイベント"
            options={eventOptions}
            selected={selectedEvents}
            onChange={setSelectedEvents}
            className="md:col-span-2 xl:col-span-2"
          />

          <fieldset className="md:hidden">
            <legend className="mb-1.5 block text-[11px] font-black text-ink/50">日付</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="sr-only">開始日</span><input aria-label="開始日" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setActivePeriod("custom"); }} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-2 text-[12px] font-bold text-ink outline-none focus:border-pink" /></label>
              <label className="block"><span className="sr-only">終了日</span><input aria-label="終了日" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setActivePeriod("custom"); }} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-2 text-[12px] font-bold text-ink outline-none focus:border-pink" /></label>
            </div>
          </fieldset>
          <label className="hidden md:block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">開始日</span><input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setActivePeriod("custom"); }} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
          <label className="hidden md:block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">終了日</span><input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setActivePeriod("custom"); }} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
        </div>

        <button
          type="button"
          aria-expanded={advancedFiltersOpen}
          aria-controls="advanced-schedule-filters"
          onClick={() => setAdvancedFiltersOpen((value) => !value)}
          className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-pink/15 bg-[#fff9fb] px-3 text-left md:hidden"
        >
          <span>
            <span className="block text-[12px] font-black text-ink">詳細条件</span>
            <span className="mt-0.5 block text-[10px] font-bold text-ink/45">場所・期間・キーワードなど</span>
          </span>
          <span className="flex items-center gap-2 text-[11px] font-black text-pink">
            {activeAdvancedFilterCount > 0 && <span className="rounded-full bg-pink px-2 py-0.5 text-white">{activeAdvancedFilterCount}</span>}
            <ChevronDown size={16} className={`transition-transform ${advancedFiltersOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>

        <div id="advanced-schedule-filters" className={`${advancedFiltersOpen ? "block" : "hidden"} md:block`}>
          <div className="mt-3 grid gap-3 border-t border-pink/10 pt-3 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-[11px] font-black text-ink/50">複数選択時の検索方法</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([['any', 'いずれかに会える日'], ['all', '全員に会える日']] as const).map(([value, label]) => <label key={value} className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px] font-bold ${matchMode === value ? "border-pink bg-pink/5 text-pink" : "border-ink/10 text-ink/60"}`}><input type="radio" name="match-mode" value={value} checked={matchMode === value} onChange={() => setMatchMode(value)} className="accent-pink" />{label}</label>)}
              </div>
            </div>
            <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">開催場所</span><div className="relative"><select value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-ink/10 bg-[#fffafd] px-3 pr-9 text-[13px] font-bold text-ink outline-none focus:border-pink"><option value="all">すべて</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pink" aria-hidden="true" /></div></label>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-pink/10 pt-3 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-[11px] font-black text-ink/50">表示期間</p><div className="mt-2 flex flex-wrap gap-2">{([['all', '全期間'], ['7', '7日間'], ['14', '14日間'], ['30', '30日間']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => applyPeriod(value)} className={`min-h-9 rounded-full border px-3 text-[11px] font-black ${activePeriod === value ? "border-pink bg-pink text-white" : "border-ink/10 bg-white text-ink/60"}`}>{label}</button>)}</div></div>
            <label className="block w-full lg:max-w-md"><span className="mb-1.5 block text-[11px] font-black text-ink/50">キーワード</span><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pink" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="予定名・キャラクター・場所から検索" className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] pl-10 pr-3 text-[13px] font-bold text-ink outline-none placeholder:text-ink/30 focus:border-pink" /></div></label>
          </div>
        </div>

        <a href="#schedule-results" className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-ink px-4 text-[12px] font-black text-white md:hidden">
          結果を見る{!isInitialLoading && !loadProblem ? `（${resultSummary}）` : ""}
        </a>
      </section>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
          <div><p className="text-[11px] font-black tracking-[0.16em] text-pink">SCHEDULE RESULTS</p><h2 className="mt-1 text-[22px] font-black text-ink">スケジュール検索結果</h2><p className="mt-1 text-[12px] font-bold text-ink/45">{fromDate.replaceAll("-", "/")}〜{toDate.replaceAll("-", "/")}</p></div>
          <div className="inline-flex rounded-xl border border-pink/15 bg-white p-1 shadow-[0_4px_14px_rgba(98,66,88,0.04)]" role="group" aria-label="表示形式">
            <button type="button" aria-pressed={viewMode === "calendar"} onClick={() => setViewMode("calendar")} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black transition-colors ${viewMode === "calendar" ? "bg-pink text-white shadow-sm" : "text-ink/55 hover:bg-pink/5"}`}><CalendarDays size={14} aria-hidden="true" />カレンダー</button>
            <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black transition-colors ${viewMode === "list" ? "bg-pink text-white shadow-sm" : "text-ink/55 hover:bg-pink/5"}`}><LayoutList size={14} aria-hidden="true" />一覧</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pink/10 px-3 py-2 text-[13px] font-black text-pink">
            {(isInitialLoading || scheduleState.isRefreshing || characterState.isRefreshing) && (
              <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            )}
            {isInitialLoading ? "読込中" : scheduleState.isRefreshing || characterState.isRefreshing ? "更新中" : resultSummary}
          </span>
          {viewMode === "list" && <button type="button" onClick={() => setSortAscending((value) => !value)} className="min-h-10 rounded-full border border-ink/10 px-3 text-[11px] font-black text-ink/60">時間の{sortAscending ? "早い順" : "遅い順"}</button>}
        </div>
      </div>

      {viewMode === "calendar" ? (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <MultiSelectField
              label="検索中のキャラクター"
              dialogLabel="キャラクターを選択"
              allLabel="すべてのキャラクター"
              options={characterOptions}
              selected={selectedCharacters}
              onChange={setSelectedCharacters}
              summaryMode="chips"
              className="hidden md:block"
            />
            <MultiSelectField
              label="表示するイベント"
              dialogLabel="表示するイベントを選択"
              allLabel="すべてのイベント"
              options={eventOptions}
              selected={selectedEvents}
              onChange={setSelectedEvents}
              summaryMode="chips"
              className="hidden md:block"
            />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#fff6f9] px-3 py-2.5 text-[11px] font-bold leading-5 text-ink/55"><Filter size={14} className="shrink-0 text-pink" aria-hidden="true" />対象月を表示します。検索範囲外の日付は選択できません。日付を選ぶと、その日の全予定を確認できます。</div>
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#fff6f9] px-3 py-2.5 text-[11px] font-bold leading-5 text-ink/55"><Filter size={14} className="shrink-0 text-pink" aria-hidden="true" />ファンスタジオは、同じ日の同じキャラクターを1枚にまとめています。各時間の行をタップしてマイプランに追加できます。</div>
      )}

      <section id="schedule-results" className="mt-4 grid scroll-mt-24 gap-4" aria-live="polite" aria-busy={isInitialLoading}>
        {isInitialLoading ? (
          <DataStatePanel state="loading" message="スケジュールを読み込んでいます…" />
        ) : loadProblem ? (
          <DataStatePanel
            state={loadProblem}
            message={loadProblem === "unavailable"
              ? "現在、スケジュール情報を表示できません。"
              : "スケジュールを読み込めませんでした。"}
            onRetry={() => {
              scheduleState.retry();
              characterState.retry();
            }}
          />
        ) : viewMode === "calendar" ? (
          <ScheduleMonthCalendar
            fromDate={fromDate}
            toDate={toDate}
            entries={filteredEntries}
            birthdays={birthdayOccurrences}
            onSelectDate={setCalendarDialogDate}
            today={today}
          />
        ) : listDates.length > 0 ? listDates.map((date) => {
          const dayEntries = entriesByDate.get(date) ?? [];
          const dayBirthdays = birthdaysByDate.get(date) ?? [];
          return (
          <div key={date} className="rounded-[22px] border border-pink/10 bg-[#fffdfd] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-11 w-11 place-items-center rounded-[14px] bg-pink text-[12px] font-black text-white shadow-[0_6px_14px_rgba(239,102,143,0.22)]"><CalendarDays size={18} aria-hidden="true" /></span><div><h3 className="text-[15px] font-black text-ink">{formatGroupDate(date)}</h3><p className="text-[10px] font-bold text-ink/40">{date.replaceAll("-", "/")}</p></div></div><span className="text-[11px] font-black text-ink/40">予定{dayEntries.length}件{dayBirthdays.length > 0 ? `・誕生日${dayBirthdays.length}件` : ""}</span></div>
            <div className="grid gap-3">
              {dayBirthdays.length > 0 && <BirthdayCard birthdays={dayBirthdays} />}
              {dayEntries.length > 0 && <ScheduleDayGrid date={date} entries={dayEntries} characters={characters} selectedCharacters={selectedCharacters} />}
            </div>
          </div>
          );
        }) : (
          <div className="rounded-[24px] border border-dashed border-pink/25 bg-white p-10 text-center"><ListEmptyIcon /><p className="mt-3 font-black text-ink">条件に一致する予定がありません</p><button type="button" onClick={reset} className="mt-4 min-h-11 rounded-full bg-pink px-5 text-[12px] font-black text-white">条件をリセット</button></div>
        )}
      </section>

      {calendarDialogDate && (
        <CalendarDayDialog
          date={calendarDialogDate}
          entries={calendarDialogEntries}
          birthdays={calendarDialogBirthdays}
          characters={characters}
          selectedCharacters={selectedCharacters}
          onClose={closeCalendarDialog}
        />
      )}

      {!isInitialLoading && !loadProblem && (
        <div className="mt-5 rounded-2xl border border-mint/20 bg-mint/10 p-4 text-[12px] font-bold leading-6 text-ink/60">表示中の情報は、確認・公開されたデータです。最新情報は公式サイトもあわせてご確認ください。</div>
      )}
    </div>
  );
}

function MultiSelectField({
  label,
  dialogLabel,
  allLabel,
  options,
  selected,
  onChange,
  className = "",
  summaryMode = "text",
}: {
  label: string;
  dialogLabel: string;
  allLabel: string;
  options: string[];
  selected: string[];
  onChange: (items: string[]) => void;
  className?: string;
  summaryMode?: "text" | "chips";
}) {
  const [open, setOpen] = useState(false);
  const toggle = (item: string) => onChange(selected.includes(item)
    ? selected.filter((value) => value !== item)
    : [...selected, item]);
  const isEventField = dialogLabel.includes("イベント");

  return (
    <div className={`relative min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[11px] font-black text-ink/50">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-left text-[13px] font-bold text-ink outline-none transition-colors hover:border-pink/35 focus:border-pink ${summaryMode === "chips" ? "py-2" : ""}`}
      >
        {selected.length === 0 ? (
          <span className="min-w-0 flex-1 truncate">{allLabel}</span>
        ) : summaryMode === "chips" ? (
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selected.slice(0, 2).map((item) => <span key={item} className="max-w-[240px] truncate rounded-full bg-pink/[0.08] px-2.5 py-1 text-[11px] font-black text-ink/75">{item}</span>)}
            {selected.length > 2 && <span className="rounded-full bg-pink/10 px-2.5 py-1 text-[11px] font-black text-pink">+{selected.length - 2}</span>}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate">{selected.slice(0, 2).join("、")}{selected.length > 2 ? ` ほか${selected.length - 2}件` : ""}</span>
        )}
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black text-pink">
          {selected.length > 0 && `${selected.length}件`}
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <>
          <button type="button" aria-label={`${dialogLabel}を閉じる`} onClick={() => setOpen(false)} className="fixed inset-0 z-[60] bg-ink/30 lg:hidden" />
          <div role="dialog" aria-label={dialogLabel} className="absolute left-0 top-[72px] z-[70] w-full min-w-[300px] rounded-2xl border border-pink/15 bg-white p-3 shadow-[0_20px_50px_rgba(75,45,55,0.2)] max-lg:fixed max-lg:inset-x-4 max-lg:top-20 max-lg:w-auto max-lg:min-w-0 max-lg:max-w-[calc(100vw-2rem)] max-lg:overflow-hidden lg:min-w-[440px]">
            <div className="flex items-center justify-between gap-3 border-b border-pink/10 pb-2">
              <div><p className="text-[14px] font-black text-ink">{dialogLabel}</p><p className="mt-0.5 text-[10px] font-bold text-ink/40">未選択の場合はすべて表示します</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" className="grid h-9 w-9 place-items-center rounded-full bg-pink/5 text-pink"><X size={17} aria-hidden="true" /></button>
            </div>
            <button type="button" onClick={() => onChange([])} className="mt-2 min-h-9 w-full rounded-lg bg-pink/5 text-[11px] font-black text-pink">すべて表示</button>
            <div className={`mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 ${isEventField ? "grid-cols-1" : "grid-cols-2"}`}>
              {options.map((item) => (
                <label key={item} className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-xl border px-2.5 text-[12px] font-bold ${selected.includes(item) ? "border-pink bg-pink/5 text-pink" : "border-ink/10 text-ink/70"}`}>
                  <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} className="sr-only" />
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected.includes(item) ? "border-pink bg-pink text-white" : "border-ink/15"}`}><Check size={13} aria-hidden="true" /></span>
                  <span className="min-w-0 break-words">{item}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="mt-3 min-h-11 w-full rounded-xl bg-pink text-[12px] font-black text-white">選択を反映して閉じる</button>
          </div>
        </>
      )}
    </div>
  );
}

function BirthdayCard({ birthdays }: { birthdays: CharacterBirthdayOccurrence[] }) {
  const names = birthdays.map(({ character }) => character.name);
  return (
    <article className="rounded-2xl border border-pink/20 bg-gradient-to-r from-[#fff4f8] to-white p-4 shadow-[0_8px_24px_rgba(118,73,86,0.05)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-pink text-white shadow-[0_6px_16px_rgba(235,110,152,0.2)]"><CakeSlice size={20} aria-hidden="true" /></span>
        <div className="min-w-0">
          <span className="text-[10px] font-black tracking-[0.14em] text-pink">CHARACTER BIRTHDAY</span>
          <h4 className="mt-0.5 text-[15px] font-black leading-6 text-ink sm:text-[17px]">{names.join("・")}の誕生日</h4>
          <p className="mt-1 text-[11px] font-bold text-ink/45">お誕生日おめでとう！</p>
        </div>
      </div>
    </article>
  );
}

function CalendarDayDialog({
  date,
  entries,
  birthdays,
  characters,
  selectedCharacters,
  onClose,
}: {
  date: string;
  entries: ScheduleEntry[];
  birthdays: CharacterBirthdayOccurrence[];
  characters: Character[];
  selectedCharacters: string[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-dialog-title"
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-t-[26px] border border-pink/15 bg-[#fffafd] shadow-[0_28px_80px_rgba(62,53,64,0.28)] outline-none sm:max-h-[88dvh] sm:rounded-[26px]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-pink/10 bg-white px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-pink text-white"><CalendarDays size={19} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.14em] text-pink">DAILY SCHEDULE</p>
              <h3 id="calendar-day-dialog-title" className="truncate text-[17px] font-black text-ink sm:text-[20px]">{formatGroupDate(date)}</h3>
              <p className="text-[10px] font-bold text-ink/40">予定{entries.length}件{birthdays.length > 0 ? `・誕生日${birthdays.length}件` : ""}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="日付の予定を閉じる" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink/5 text-pink transition-colors hover:bg-pink/10"><X size={19} aria-hidden="true" /></button>
        </header>

        <div className="overflow-y-auto overscroll-contain p-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-5">
          {birthdays.length > 0 && <BirthdayCard birthdays={birthdays} />}
          {entries.length > 0 && (
            <div className={birthdays.length > 0 ? "mt-3" : ""}>
              <ScheduleDayGrid date={date} entries={entries} characters={characters} selectedCharacters={selectedCharacters} />
            </div>
          )}
          {birthdays.length === 0 && entries.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-pink/20 bg-white px-5 py-12 text-center">
              <CalendarDays size={24} className="mx-auto text-pink/45" aria-hidden="true" />
              <p className="mt-3 text-[14px] font-black text-ink">この日の予定はありません</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ListEmptyIcon() {
  return <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pink/10 text-pink"><CalendarDays size={22} aria-hidden="true" /></div>;
}

function ScheduleDayGrid({
  date,
  entries,
  characters,
  selectedCharacters,
}: {
  date: string;
  entries: ScheduleEntry[];
  characters: Character[];
  selectedCharacters: string[];
}) {
  const fanStudioByCharacter = new Map<string, ScheduleEntry[]>();

  entries.filter(isFanStudioGreeting).forEach((entry) => {
    const names = getEntryCharacterNames(entry);
    (names.length > 0 ? names : [fanStudioFallbackName(entry)]).forEach((name) => {
      fanStudioByCharacter.set(name, [...(fanStudioByCharacter.get(name) ?? []), entry]);
    });
  });

  const groupedCards = sortCharacterNames(Array.from(fanStudioByCharacter.keys()), characters).map((name) => ({
    type: "fan-studio" as const,
    key: `fan-studio:${name}`,
    sortTime: fanStudioByCharacter.get(name)?.[0]?.startTime ?? "23:59",
    name,
    entries: [...(fanStudioByCharacter.get(name) ?? [])].sort((left, right) => `${left.startTime}-${left.title}`.localeCompare(`${right.startTime}-${right.title}`, "ja")),
  }));
  const regularCards = entries.filter((entry) => !isFanStudioGreeting(entry)).map((entry) => ({
    type: "entry" as const,
    key: entry.id,
    sortTime: entry.startTime,
    entry,
  }));
  const cards = [...regularCards, ...groupedCards].sort((left, right) => `${left.sortTime}-${left.key}`.localeCompare(`${right.sortTime}-${right.key}`, "ja"));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => card.type === "entry"
        ? <ScheduleEntryCard key={card.key} entry={card.entry} selectedCharacters={selectedCharacters} planDate={date} />
        : <FanStudioCharacterCard key={card.key} date={date} name={card.name} entries={card.entries} selected={selectedCharacters.includes(card.name)} />)}
    </div>
  );
}

function FanStudioCharacterCard({ date, name, entries, selected }: { date: string; name: string; entries: ScheduleEntry[]; selected: boolean }) {
  return (
    <article className="rounded-2xl border border-lavender/20 bg-white p-4 shadow-[0_8px_24px_rgba(118,73,86,0.06)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender/10 px-2.5 py-1.5 text-[11px] font-black text-lavender">
          <Sparkles size={13} aria-hidden="true" />ファンスタジオ
        </span>
        <span className="text-[10px] font-black text-ink/35">{entries.length}回</span>
      </div>
      <h3 className="mt-3 text-[17px] font-black leading-6 text-ink">
        <span className={selected ? "rounded-md bg-pink/10 px-1.5 py-0.5 text-pink" : undefined}>
          {name}
          {selected && <span className="sr-only">（検索対象として選択中）</span>}
        </span>
      </h3>
      <details className="group mt-4 border-t border-lavender/15 text-[11px] font-bold">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg pt-2 text-ink/50 outline-none transition-colors hover:text-lavender focus-visible:ring-2 focus-visible:ring-lavender/30 [&::-webkit-details-marker]:hidden">
          <span>スケジュール詳細</span>
          <ChevronDown size={14} className="shrink-0 text-lavender transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-2 pt-1">
          {entries.map((entry) => {
            const appearance = specialAppearance(entry);
            return (
              <PlanToggleSurface
                key={entry.id}
                entry={entry}
                targetDate={date}
                className={`block w-full rounded-xl border px-3 py-2.5 text-left transition-[background-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender/30 ${appearance ? "border-[#efd69f] bg-[#fffaf0] hover:bg-[#fff5df]" : "border-lavender/15 bg-[#faf8fc] hover:bg-lavender/5"}`}
                addedClassName="border-mint/40 bg-[#f4fbf8]"
                pressedClassName="scale-[0.99] shadow-inner"
              >
                {({ added, pressed }) => (
                  <>
                    <span className="flex items-center gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-black tabular-nums text-ink">
                        <Clock3 size={13} className="shrink-0 text-pink" aria-hidden="true" />
                        {entry.startTime}{entry.endTime ? `–${entry.endTime}` : "〜"}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${appearance ? "bg-[#f6b83f]/15 text-[#8c5a0c]" : "bg-lavender/10 text-lavender"}`}>
                          {appearance && <Sun size={10} aria-hidden="true" />}{appearance ?? "通常の姿"}
                        </span>
                        <PlanToggleIndicator
                          added={added}
                          pressed={pressed}
                          size={15}
                          className={added ? "text-[#35745f]" : "text-lavender"}
                        />
                      </span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-ink/45"><MapPin size={11} className="shrink-0" aria-hidden="true" />{shortFanStudioLocation(entry.location)}</span>
                  </>
                )}
              </PlanToggleSurface>
            );
          })}
        </div>
      </details>
    </article>
  );
}
