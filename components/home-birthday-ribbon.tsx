"use client";

import Link from "next/link";
import {
  formatCharacterBirthday,
  getUpcomingCharacterBirthdays,
  isBirthdayCountdownVisible,
  todayInJapan,
} from "@/lib/character-birthday";
import { type InitialCharacterData, useCharacters } from "@/lib/character-store";
import { SectionHeading } from "./section-heading";

export function HomeBirthdayRibbon({
  initialCharacterData,
}: {
  initialCharacterData: InitialCharacterData;
}) {
  const { characters } = useCharacters({ initialData: initialCharacterData });
  const birthdays = getUpcomingCharacterBirthdays(characters, todayInJapan())
    .filter(({ daysUntil }) => isBirthdayCountdownVisible(daysUntil));

  if (birthdays.length === 0) return null;

  return (
    <section
      aria-label="30日以内のキャラクターの誕生日"
      className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 sm:pt-12 lg:px-8"
    >
      <SectionHeading
        eyebrow="UPCOMING BIRTHDAYS"
        title="30日以内の誕生日"
        href="/characters"
        linkLabel="キャラクターを見る"
      />
      <ul className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-[20px] border border-pink/10 bg-white px-4 py-4 shadow-soft sm:gap-x-6 sm:px-5 lg:grid-cols-4 lg:gap-x-8">
        {birthdays.map(({ character, birthday, date }) => (
          <li key={character.id}>
            <Link
              href={`/characters#character-${encodeURIComponent(character.slug)}`}
              className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-xl px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/40"
              aria-label={`${character.name}の誕生日は${formatCharacterBirthday(birthday)}`}
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: character.themeColor }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black leading-5 text-ink transition-colors group-hover:text-pink sm:text-[12px]">
                  {character.name}
                </span>
                <time
                  dateTime={date}
                  className="mt-0.5 block text-[10px] font-bold leading-4 text-ink/45 sm:text-[11px]"
                >
                  {formatCharacterBirthday(birthday)}
                </time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
