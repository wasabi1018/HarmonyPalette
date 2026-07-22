"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Character } from "@/data/types";
import { getNextScheduleForCharacter, sampleDate, schedules } from "@/data/site-data";
import { useCharacters } from "@/lib/character-store";
import { CharacterAvatar } from "./character-avatar";

export function CharacterBrowser({ initialCharacters }: { initialCharacters?: Character[] }) {
  const characters = useCharacters(initialCharacters);
  const [query, setQuery] = useState("");
  const [onlyScheduled, setOnlyScheduled] = useState(false);
  const filtered = useMemo(() => characters.filter((character) => {
    const matchesQuery = `${character.name}${character.nameKana}`.includes(query.trim());
    const matchesSchedule = !onlyScheduled || schedules.some((schedule) => schedule.date === sampleDate && schedule.characterIds.includes(character.id));
    return matchesQuery && matchesSchedule;
  }), [characters, onlyScheduled, query]);

  return <div className="mt-8">
    <div className="rounded-[26px] border border-pink/10 bg-white p-5 shadow-soft sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-pink" aria-hidden="true" /><h2 className="font-black text-ink">キャラクターを探す</h2></div><p className="mt-2 text-xs leading-6 text-ink/55">名前や今日の登場予定から絞り込めます。</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><span className="sr-only">キャラクター名で検索</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前で検索" className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] pl-10 pr-4 text-sm font-bold text-ink outline-none placeholder:text-ink/35 focus:border-pink sm:w-56" /></label><button type="button" onClick={() => setOnlyScheduled((value) => !value)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black ${onlyScheduled ? "border-pink bg-pink text-white" : "border-ink/10 text-ink/65 hover:border-pink/30 hover:text-pink"}`}><Check size={15} aria-hidden="true" />今日会える</button></div></div></div>
    <p className="mt-5 text-sm font-bold text-ink/55"><span className="text-pink">{filtered.length}</span> キャラクター</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((character) => { const next = getNextScheduleForCharacter(character.id); return <Link key={character.id} href={`/characters/${character.slug}`} className="group rounded-[26px] border border-pink/10 bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"><div className="flex items-start gap-3"><CharacterAvatar character={character} size="lg" /><h3 className="self-center font-black text-ink group-hover:text-pink">{character.name}</h3></div><div className="mt-4 grid gap-2 rounded-2xl bg-[#fff9fb] p-3 text-xs font-bold text-ink/60"><div className="flex items-center gap-2"><CalendarDays size={14} className="text-pink" aria-hidden="true" />{next ? `次回 ${next.date === sampleDate ? "今日" : next.date} ${next.startTime}` : "登場予定を確認"}</div><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${next ? "bg-mint" : "bg-ink/20"}`} aria-hidden="true" />{next ? next.location : "予定情報なし"}</div></div><span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-pink group-hover:gap-3">詳細を見る <ArrowRight size={15} aria-hidden="true" /></span></Link>; })}</div>
    {filtered.length === 0 && <div className="mt-5 rounded-[26px] border border-dashed border-pink/20 bg-white p-10 text-center font-black text-ink">見つかりませんでした</div>}
  </div>;
}
