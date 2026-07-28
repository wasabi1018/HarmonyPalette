"use client";

import Link from "next/link";
import { ArrowRight, CakeSlice, Sparkles } from "lucide-react";
import {
  formatCharacterBirthday,
  getNextCharacterBirthdayGroup,
  isBirthdayCountdownVisible,
  todayInJapan,
} from "@/lib/character-birthday";
import { useCharacters } from "@/lib/character-store";
import { CharacterAvatar } from "./character-avatar";

function characterNames(names: string[]) {
  if (names.length <= 2) return names.join("・");
  return `${names.slice(0, 2).join("・")}ほか${names.length - 2}キャラクター`;
}

export function HomeBirthdayRibbon() {
  const { characters } = useCharacters();
  const birthdays = getNextCharacterBirthdayGroup(characters, todayInJapan());

  if (
    birthdays.length === 0
    || !isBirthdayCountdownVisible(birthdays[0].daysUntil)
  ) {
    return null;
  }

  const { birthday, daysUntil } = birthdays[0];
  const featuredCharacter = birthdays[0].character;
  const names = characterNames(birthdays.map(({ character }) => character.name));
  const timing = daysUntil === 0 ? "今日が誕生日！" : `あと${daysUntil}日`;
  const message = daysUntil === 0
    ? `今日は${names}の誕生日！`
    : `${names}の誕生日まであと${daysUntil}日`;

  return (
    <section
      aria-label="キャラクターの誕生日"
      className="mx-auto max-w-[1200px] px-4 pt-5 sm:px-6 lg:px-8"
    >
      <Link
        href={`/characters#character-${encodeURIComponent(featuredCharacter.slug)}`}
        aria-label={`キャラクター一覧で${names}の誕生日を見る`}
        className="group relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-[20px] border border-pink/20 bg-gradient-to-r from-[#fff0f5] via-white to-[#f6f1ff] px-4 py-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-pink/35 hover:shadow-card sm:gap-4 sm:px-5"
      >
        <span
          className="absolute -right-8 -top-12 h-28 w-28 rounded-full bg-pink/5"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-2 right-16 hidden text-pink/20 sm:block"
          aria-hidden="true"
        >
          <Sparkles size={24} />
        </span>

        <span className="relative flex shrink-0 -space-x-2">
          {birthdays.slice(0, 3).map(({ character }) => (
            <CharacterAvatar key={character.id} character={character} size="xs" />
          ))}
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink px-2.5 py-1 text-[9px] font-black tracking-[0.08em] text-white">
              <CakeSlice size={11} aria-hidden="true" />
              BIRTHDAY
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${daysUntil === 0 ? "bg-[#f6b83f]/20 text-[#9a6512]" : "bg-lavender/10 text-lavender"}`}>
              {timing}
            </span>
          </span>
          <span className="mt-1.5 block text-[13px] font-black leading-5 text-ink sm:text-[15px]">
            {message}
          </span>
          <span className="mt-0.5 block text-[10px] font-bold text-ink/45">
            {formatCharacterBirthday(birthday)}
          </span>
        </span>

        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-pink shadow-soft transition-transform group-hover:translate-x-0.5">
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}
