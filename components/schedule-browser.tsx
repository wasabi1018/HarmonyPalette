"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, Clock3, Filter, MapPin, RotateCcw, Search, Settings2, SlidersHorizontal, Sparkles, Sun, X } from "lucide-react";
import type { Character } from "@/data/types";
import { sampleDate } from "@/data/site-data";
import { ScheduleEntryCard } from "@/components/schedule-entry-card";
import { sortCharacterNames, useCharacters } from "@/lib/character-store";
import { fanStudioFallbackName, isFanStudioGreeting, shortFanStudioLocation, specialAppearance } from "@/lib/schedule-display";
import { getEntryCharacterNames, type ScheduleEntry, useScheduleEntries } from "@/lib/schedule-store";

type MatchMode = "any" | "all";
type Period = "all" | "7" | "14" | "30";

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatGroupDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" })
    .format(new Date(`${date}T00:00:00`));
}

export function ScheduleBrowser({
  initialCharacters = [],
  initialFromDate,
  initialToDate,
}: {
  initialCharacters?: string[];
  initialFromDate?: string;
  initialToDate?: string;
}) {
  const entries = useScheduleEntries();
  const characters = useCharacters();
  const hasInitialDateRange = Boolean(initialFromDate || initialToDate);
  const [fromDate, setFromDate] = useState(initialFromDate ?? sampleDate);
  const [toDate, setToDate] = useState(initialToDate ?? (initialFromDate ? initialFromDate : addDays(sampleDate, 13)));
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(initialCharacters);
  const [matchMode, setMatchMode] = useState<MatchMode>("any");
  const [kind, setKind] = useState("all");
  const [scheduleType, setScheduleType] = useState("all");
  const [location, setLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [sortAscending, setSortAscending] = useState(true);
  const [characterPanelOpen, setCharacterPanelOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState<Period | "custom">(hasInitialDateRange ? "custom" : "14");

  const bounds = useMemo(() => {
    const dates = entries.flatMap((entry) => [entry.date, entry.endDate ?? entry.date]).sort();
    return { min: dates[0] ?? sampleDate, max: dates.at(-1) ?? sampleDate };
  }, [entries]);
  const locations = useMemo(() => Array.from(new Set(entries.map((entry) => entry.location))).sort((a, b) => a.localeCompare(b, "ja")), [entries]);
  const scheduleTypes = useMemo(() => Array.from(new Set(entries.filter((entry) => kind === "all" || entry.kind === kind).map((entry) => entry.scheduleType))).sort((a, b) => a.localeCompare(b, "ja")), [entries, kind]);
  const characterOptions = useMemo(() => sortCharacterNames([
    ...characters.map((character) => character.name),
    ...entries.flatMap((entry) => getEntryCharacterNames(entry)),
  ], characters), [characters, entries]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("character");
    selectedCharacters.forEach((name) => url.searchParams.append("character", name));
    url.searchParams.set("from", fromDate);
    url.searchParams.set("to", toDate);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [fromDate, selectedCharacters, toDate]);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const entryEnd = entry.endDate ?? entry.date;
    const matchesDate = entry.date <= toDate && entryEnd >= fromDate;
    const entryCharacterNames = getEntryCharacterNames(entry);
    const matchesCharacters = selectedCharacters.length === 0 || (matchMode === "any"
      ? selectedCharacters.some((name) => entryCharacterNames.includes(name))
      : selectedCharacters.every((name) => entryCharacterNames.includes(name)));
    const matchesKind = kind === "all" || entry.kind === kind;
    const matchesType = scheduleType === "all" || entry.scheduleType === scheduleType;
    const matchesLocation = location === "all" || entry.location === location;
    const keyword = query.trim().toLocaleLowerCase("ja");
    const matchesQuery = keyword === "" || `${entry.title}${entry.location}${entry.scheduleType}${entryCharacterNames.join("")}`.toLocaleLowerCase("ja").includes(keyword);
    return matchesDate && matchesCharacters && matchesKind && matchesType && matchesLocation && matchesQuery;
  }).sort((a, b) => {
    const result = `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`);
    return sortAscending ? result : -result;
  }), [entries, fromDate, kind, location, matchMode, query, scheduleType, selectedCharacters, sortAscending, toDate]);

  const groups = useMemo(() => {
    const grouped = new Map<string, typeof filteredEntries>();
    filteredEntries.forEach((entry) => {
      const displayDate = entry.kind === "event" && entry.date < fromDate ? fromDate : entry.date;
      grouped.set(displayDate, [...(grouped.get(displayDate) ?? []), entry]);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => sortAscending ? a.localeCompare(b) : b.localeCompare(a));
  }, [filteredEntries, fromDate, sortAscending]);

  const toggleCharacter = (name: string) => setSelectedCharacters((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const reset = () => {
    setFromDate(sampleDate);
    setToDate(addDays(sampleDate, 13));
    setSelectedCharacters([]);
    setMatchMode("any");
    setKind("all");
    setScheduleType("all");
    setLocation("all");
    setQuery("");
    setSortAscending(true);
    setActivePeriod("14");
  };
  const applyPeriod = (period: Period) => {
    setActivePeriod(period);
    if (period === "all") {
      setFromDate(bounds.min);
      setToDate(bounds.max);
      return;
    }
    setFromDate(sampleDate);
    setToDate(addDays(sampleDate, Number(period) - 1));
  };

  const characterSummary = selectedCharacters.length === 0
    ? "すべてのキャラクター"
    : selectedCharacters.join("、");

  return (
    <div className="mt-5">
      <section className="rounded-[24px] border border-pink/10 bg-white p-4 shadow-soft sm:p-5" aria-label="検索条件">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-pink" aria-hidden="true" /><h2 className="text-[16px] font-black text-ink">スケジュールを絞り込む</h2></div>
          <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-black text-pink hover:bg-pink/5"><RotateCcw size={14} aria-hidden="true" />リセット</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2 xl:col-span-1">
            <span className="mb-1.5 block text-[11px] font-black text-ink/50">キャラクター</span>
            <button type="button" aria-expanded={characterPanelOpen} onClick={() => setCharacterPanelOpen((value) => !value)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-left text-[13px] font-bold text-ink outline-none focus:border-pink">
              <span className="truncate">{characterSummary}</span><ChevronDown size={15} className="shrink-0 text-pink" aria-hidden="true" />
            </button>
            {characterPanelOpen && (
              <>
                <button type="button" aria-label="キャラクター選択を閉じる" onClick={() => setCharacterPanelOpen(false)} className="fixed inset-0 z-[60] bg-ink/30 lg:hidden" />
                <div role="dialog" aria-label="キャラクターを選択" className="absolute left-0 top-[72px] z-[70] w-full min-w-[280px] rounded-2xl border border-pink/15 bg-white p-3 shadow-[0_20px_50px_rgba(75,45,55,0.2)] max-lg:fixed max-lg:inset-x-4 max-lg:top-20 max-lg:w-auto sm:min-w-[390px]">
                  <div className="flex items-center justify-between gap-3 border-b border-pink/10 pb-2"><p className="text-[14px] font-black text-ink">キャラクターを選択</p><button type="button" onClick={() => setCharacterPanelOpen(false)} aria-label="閉じる" className="grid h-9 w-9 place-items-center rounded-full bg-pink/5 text-pink"><X size={17} aria-hidden="true" /></button></div>
                  <div className="mt-2 flex gap-2"><button type="button" onClick={() => setSelectedCharacters(characterOptions)} className="min-h-9 flex-1 rounded-lg bg-pink/5 text-[11px] font-black text-pink">すべて選択</button><button type="button" onClick={() => setSelectedCharacters([])} className="min-h-9 flex-1 rounded-lg bg-[#f5f2f4] text-[11px] font-black text-ink/60">選択を解除</button></div>
                  <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                    {characterOptions.map((name) => <label key={name} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-[12px] font-bold ${selectedCharacters.includes(name) ? "border-pink bg-pink/5 text-pink" : "border-ink/10 text-ink/70"}`}><input type="checkbox" checked={selectedCharacters.includes(name)} onChange={() => toggleCharacter(name)} className="sr-only" /><span className={`grid h-5 w-5 place-items-center rounded-md border ${selectedCharacters.includes(name) ? "border-pink bg-pink text-white" : "border-ink/15"}`}><Check size={13} aria-hidden="true" /></span>{name}</label>)}
                  </div>
                  <button type="button" onClick={() => setCharacterPanelOpen(false)} className="mt-3 min-h-11 w-full rounded-xl bg-pink text-[12px] font-black text-white">選択を反映して閉じる</button>
                </div>
              </>
            )}
          </div>

          <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">予定の種類</span><div className="relative"><select value={kind} onChange={(event) => { setKind(event.target.value); setScheduleType("all"); }} className="min-h-11 w-full appearance-none rounded-xl border border-ink/10 bg-[#fffafd] px-3 pr-9 text-[13px] font-bold text-ink outline-none focus:border-pink"><option value="all">すべて</option><option value="greeting">グリーティング</option><option value="event">イベント</option></select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pink" aria-hidden="true" /></div></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">イベント・種別</span><div className="relative"><select value={scheduleType} onChange={(event) => setScheduleType(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-ink/10 bg-[#fffafd] px-3 pr-9 text-[13px] font-bold text-ink outline-none focus:border-pink"><option value="all">すべて</option>{scheduleTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pink" aria-hidden="true" /></div></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">開始日</span><input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setActivePeriod("custom"); }} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">終了日</span><input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setActivePeriod("custom"); }} className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none focus:border-pink" /></label>
        </div>

        <div className="mt-3 grid gap-3 border-t border-pink/10 pt-3 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-[11px] font-black text-ink/50">複数選択時の検索方法</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {([['any', 'いずれかに会える予定'], ['all', '全員に会える予定']] as const).map(([value, label]) => <label key={value} className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px] font-bold ${matchMode === value ? "border-pink bg-pink/5 text-pink" : "border-ink/10 text-ink/60"}`}><input type="radio" name="match-mode" value={value} checked={matchMode === value} onChange={() => setMatchMode(value)} className="accent-pink" />{label}</label>)}
            </div>
          </div>
          <label className="block"><span className="mb-1.5 block text-[11px] font-black text-ink/50">開催場所</span><div className="relative"><select value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-ink/10 bg-[#fffafd] px-3 pr-9 text-[13px] font-bold text-ink outline-none focus:border-pink"><option value="all">すべて</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-pink" aria-hidden="true" /></div></label>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-pink/10 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[11px] font-black text-ink/50">表示期間</p><div className="mt-2 flex flex-wrap gap-2">{([['all', '全期間'], ['7', '7日間'], ['14', '14日間'], ['30', '30日間']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => applyPeriod(value)} className={`min-h-9 rounded-full border px-3 text-[11px] font-black ${activePeriod === value ? "border-pink bg-pink text-white" : "border-ink/10 bg-white text-ink/60"}`}>{label}</button>)}</div></div>
          <label className="block w-full lg:max-w-md"><span className="mb-1.5 block text-[11px] font-black text-ink/50">キーワード</span><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pink" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="予定名・キャラクター・場所から検索" className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] pl-10 pr-3 text-[13px] font-bold text-ink outline-none placeholder:text-ink/30 focus:border-pink" /></div></label>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-black tracking-[0.16em] text-pink">SCHEDULE LIST</p><h2 className="mt-1 text-[22px] font-black text-ink">スケジュール一覧</h2><p className="mt-1 text-[12px] font-bold text-ink/45">{fromDate.replaceAll("-", "/")}〜{toDate.replaceAll("-", "/")}</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-pink/10 px-3 py-2 text-[13px] font-black text-pink">{filteredEntries.length}件</span><button type="button" onClick={() => setSortAscending((value) => !value)} className="min-h-10 rounded-full border border-ink/10 px-3 text-[11px] font-black text-ink/60">時間の{sortAscending ? "早い順" : "遅い順"}</button></div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#fff6f9] px-3 py-2.5 text-[11px] font-bold leading-5 text-ink/55"><Filter size={14} className="shrink-0 text-pink" aria-hidden="true" />ファンスタジオは、同じ日の同じキャラクターを1枚にまとめています。通常の姿と特別な姿は、時間ごとに確認できます。</div>

      <section id="schedule-results" className="mt-4 grid scroll-mt-24 gap-4" aria-live="polite">
        {groups.length > 0 ? groups.map(([date, dayEntries]) => (
          <div key={date} className="rounded-[22px] border border-pink/10 bg-[#fffdfd] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-11 w-11 place-items-center rounded-[14px] bg-pink text-[12px] font-black text-white shadow-[0_6px_14px_rgba(239,102,143,0.22)]"><CalendarDays size={18} aria-hidden="true" /></span><div><h3 className="text-[15px] font-black text-ink">{formatGroupDate(date)}</h3><p className="text-[10px] font-bold text-ink/40">{date.replaceAll("-", "/")}</p></div></div><span className="text-[11px] font-black text-ink/40">{dayEntries.length}件</span></div>
            <ScheduleDayGrid entries={dayEntries} characters={characters} />
          </div>
        )) : (
          <div className="rounded-[24px] border border-dashed border-pink/25 bg-white p-10 text-center"><ListEmptyIcon /><p className="mt-3 font-black text-ink">条件に一致する予定がありません</p><button type="button" onClick={reset} className="mt-4 min-h-11 rounded-full bg-pink px-5 text-[12px] font-black text-white">条件をリセット</button></div>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-mint/20 bg-mint/10 p-4 text-[12px] font-bold leading-6 text-ink/60 sm:flex-row sm:items-center sm:justify-between"><span>表示中の情報には、公式サイトから取り込んだ確認済みデータまたは動作確認用サンプルが含まれます。最新情報は公式サイトをご確認ください。</span><Link href="/admin/schedule" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[11px] font-black text-white"><Settings2 size={14} aria-hidden="true" />予定を管理</Link></div>
    </div>
  );
}

function ListEmptyIcon() {
  return <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pink/10 text-pink"><CalendarDays size={22} aria-hidden="true" /></div>;
}

function ScheduleDayGrid({ entries, characters }: { entries: ScheduleEntry[]; characters: Character[] }) {
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
        ? <ScheduleEntryCard key={card.key} entry={card.entry} />
        : <FanStudioCharacterCard key={card.key} name={card.name} entries={card.entries} />)}
    </div>
  );
}

function FanStudioCharacterCard({ name, entries }: { name: string; entries: ScheduleEntry[] }) {
  return (
    <article className="rounded-2xl border border-lavender/20 bg-white p-4 shadow-[0_8px_24px_rgba(118,73,86,0.06)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender/10 px-2.5 py-1.5 text-[11px] font-black text-lavender">
          <Sparkles size={13} aria-hidden="true" />ファンスタジオ
        </span>
        <span className="text-[10px] font-black text-ink/35">{entries.length}回</span>
      </div>
      <h3 className="mt-3 text-[17px] font-black leading-6 text-ink">{name}</h3>
      <div className="mt-3 grid gap-2">
        {entries.map((entry) => {
          const appearance = specialAppearance(entry);
          return (
            <div key={entry.id} className={`rounded-xl border px-3 py-2.5 ${appearance ? "border-[#efd69f] bg-[#fffaf0]" : "border-lavender/15 bg-[#faf8fc]"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-black tabular-nums text-ink">
                  <Clock3 size={13} className="text-pink" aria-hidden="true" />
                  {entry.startTime}{entry.endTime ? `–${entry.endTime}` : "〜"}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${appearance ? "bg-[#f6b83f]/15 text-[#8c5a0c]" : "bg-lavender/10 text-lavender"}`}>
                  {appearance && <Sun size={10} aria-hidden="true" />}{appearance ?? "通常の姿"}
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-ink/45"><MapPin size={11} className="shrink-0" aria-hidden="true" />{shortFanStudioLocation(entry.location)}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
