"use client";

import Link from "next/link";
import { ArrowRight, Cake, Sparkles } from "lucide-react";
import { formatCharacterBirthday, getUpcomingCharacterBirthdays, isBirthdayCountdownVisible, todayInJapan } from "@/lib/character-birthday";
import { type InitialCharacterData, useCharacters } from "@/lib/character-store";

export function HomeBirthdayRibbon({ initialCharacterData }: { initialCharacterData: InitialCharacterData }) {
  const { characters } = useCharacters({ initialData: initialCharacterData });
  const birthdays = getUpcomingCharacterBirthdays(characters, todayInJapan()).filter(({ daysUntil }) => isBirthdayCountdownVisible(daysUntil));
  if (birthdays.length === 0) return null;
  return (
    <section aria-label="30日以内のキャラクターの誕生日" className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-2xl border border-pink/15 bg-gradient-to-br from-[#fff3f8] via-[#fff8fb] to-[#f6f0fc] px-2 py-2.5 md:flex md:items-center md:gap-5 md:px-4">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <span className="absolute -left-6 -top-7 h-24 w-24 rounded-full bg-pink/[0.05]" />
          <Sparkles size={54} strokeWidth={1} className="absolute -bottom-2 -right-1 rotate-12 text-lavender/20" />
        </div>
        <div className="relative flex shrink-0 items-center justify-between gap-3 md:contents">
          <h2 className="flex items-center gap-2 text-[14px] font-black text-ink"><span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/90 text-pink shadow-[0_2px_8px_rgba(235,110,152,0.12)]"><Cake size={21} aria-hidden="true" /><Sparkles size={11} className="absolute -right-0.5 top-0 text-lavender" aria-hidden="true" /></span>30日以内の誕生日</h2>
          <Link href="/characters" className="relative inline-flex min-h-11 shrink-0 items-center gap-1 text-[12px] font-bold text-[#b43e68] hover:underline md:order-last md:ml-auto">{birthdays.length > 4 ? `ほか${birthdays.length - 4}件を見る` : "キャラクターを見る"}<ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        <ul className={`relative grid gap-2 ${birthdays.length === 1 ? "grid-cols-1" : birthdays.length === 3 ? "grid-cols-3" : "grid-cols-2"} md:flex md:flex-1 md:flex-wrap`}>
          {birthdays.slice(0, 4).map(({ character, birthday, date }) => (
            <li key={character.id} className="min-w-0">
              <Link href={`/characters#character-${encodeURIComponent(character.slug)}`} className="flex min-h-11 min-w-0 flex-col items-center justify-center rounded-xl border border-pink/10 bg-white/90 px-1.5 py-1 text-[12px] leading-5 text-ink shadow-[0_2px_6px_rgba(98,66,88,0.03)] transition-colors hover:border-pink/30 hover:bg-white hover:text-[#b43e68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink lg:flex-row lg:gap-2 lg:rounded-full lg:px-3" aria-label={`${character.name}の誕生日は${formatCharacterBirthday(birthday)}`}>
                <span className="flex min-w-0 items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: character.themeColor }} aria-hidden="true" /><span className="min-w-0 break-words font-bold">{character.name}</span></span><time dateTime={date} className="mt-0.5 rounded-full bg-[#fff0f5] px-2 text-[11px] font-medium leading-4 tabular-nums text-ink/70 lg:mt-0">{Number(date.slice(5, 7))}/{Number(date.slice(8, 10))}</time>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
