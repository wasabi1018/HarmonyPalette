"use client";

import Link from "next/link";
import { ArrowRight, Clock3, MapPin, Sparkles } from "lucide-react";
import type { Character } from "@/data/types";
import { mergeCharactersWithNames, sortCharacterNames, useCharacters } from "@/lib/character-store";
import { getEntryCharacterNames, type ScheduleEntry, useScheduleEntries } from "@/lib/schedule-store";
import { CharacterAvatar } from "@/components/character-avatar";
import { SectionHeading } from "@/components/section-heading";

function japanDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function japanTime() {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date()).replace("：", ":");
}

function entryStatus(entry: ScheduleEntry, currentTime: string) {
  if (entry.endTime && entry.endTime <= currentTime) return { label: "終了", className: "bg-ink/5 text-ink/45" };
  if (entry.startTime <= currentTime) return { label: "開催中", className: "bg-mint/15 text-[#35745f]" };
  const [currentHour, currentMinute] = currentTime.split(":").map(Number);
  const [startHour, startMinute] = entry.startTime.split(":").map(Number);
  const difference = startHour * 60 + startMinute - (currentHour * 60 + currentMinute);
  if (difference <= 30) return { label: "まもなく", className: "bg-[#fff4df] text-[#a76624]" };
  return { label: "これから", className: "bg-pink/10 text-pink" };
}

function displayUpdatedAt(value?: string) {
  if (!value) return "更新日時なし";
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "").slice(0, 16).replaceAll("-", "/");
}

export function HomeTodaySections() {
  const entries = useScheduleEntries();
  const catalogCharacters = useCharacters();
  const today = japanDate();
  const currentTime = japanTime();
  const todayGreetings = entries
    .filter((entry) => entry.kind === "greeting" && entry.date === today)
    .sort((left, right) => `${left.startTime}-${left.title}`.localeCompare(`${right.startTime}-${right.title}`, "ja"));
  const characters = mergeCharactersWithNames(
    catalogCharacters,
    todayGreetings.flatMap((entry) => getEntryCharacterNames(entry)),
  );

  const characterById = new Map(characters.map((character) => [character.id, character]));
  const appearingIds = new Set(todayGreetings.flatMap((entry) => entry.characterIds));
  const appearingNames = new Set(todayGreetings.flatMap((entry) => getEntryCharacterNames(entry)));
  const todayCharacters = characters
    .filter((character) => appearingIds.has(character.id) || appearingNames.has(character.name));

  const nextIndex = todayGreetings.findIndex((entry) => (entry.endTime || entry.startTime) >= currentTime);
  const visibleSchedules = nextIndex >= 0
    ? todayGreetings.slice(nextIndex, nextIndex + 3)
    : todayGreetings.slice(-3);
  const latestUpdatedAt = todayGreetings
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
                  href="/schedule"
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
        <div className="rounded-[26px] border border-pink/10 bg-[#fff6f9] p-4 sm:p-6">
          <SectionHeading
            eyebrow="UP NEXT"
            title="今日のグリーティング"
            description="次に開催される予定から、時間順に確認できます。"
            href="/schedule"
            linkLabel="全スケジュール"
          />
          {visibleSchedules.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {visibleSchedules.map((entry) => {
                const status = entryStatus(entry, currentTime);
                const names = namesForEntry(entry);
                return (
                  <article key={entry.id} className="rounded-2xl border border-pink/10 bg-white p-4 shadow-[0_8px_24px_rgba(118,73,86,0.06)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[20px] font-black text-ink">{entry.startTime}<span className="ml-1 text-[11px] text-ink/35">{entry.endTime ? `–${entry.endTime}` : "〜"}</span></span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
                    </div>
                    <h3 className="mt-3 text-[14px] font-black leading-5 text-ink">{entry.title}</h3>
                    {names.length > 0 && <p className="mt-1.5 text-[12px] font-bold leading-5 text-pink">{names.join("・")}</p>}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-bold text-ink/50">
                      <span className="inline-flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{entry.location}</span>
                      <span>{entry.scheduleType}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-pink/20 bg-white px-4 py-7 text-center text-[12px] font-bold text-ink/50">
              今日の公開済みグリーティングはまだありません。
            </p>
          )}
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
            <Clock3 size={13} aria-hidden="true" />
            最終更新：{displayUpdatedAt(latestUpdatedAt)}
            <span className="text-ink/20">|</span>
            {todayGreetings.some((entry) => entry.isImported) ? "公式参照データ" : "サンプル・手入力データ"}
          </p>
        </div>
      </section>
    </>
  );
}
