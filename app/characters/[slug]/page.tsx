import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Sparkles } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { OfficialNotice } from "@/components/official-notice";
import { ScheduleCard } from "@/components/schedule-card";
import { characters, getCharactersForSchedule, schedules } from "@/data/site-data";

export function generateStaticParams() { return characters.map((character) => ({ slug: character.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const character = characters.find((item) => item.slug === slug);
  return character ? { title: `${character.name}の登場予定`, description: `${character.name}の紹介文、直近のグリーティング予定、公式情報へのリンクを確認できます。`, alternates: { canonical: `/characters/${character.slug}` } } : {};
}

export default async function CharacterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const character = characters.find((item) => item.slug === slug);
  if (!character) notFound();
  const characterSchedules = schedules.filter((schedule) => schedule.characterIds.includes(character.id)).slice(0, 4);
  return <div className="mx-auto max-w-[1000px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12"><Link href="/characters" className="inline-flex items-center gap-2 text-sm font-black text-pink hover:underline"><ArrowLeft size={16} aria-hidden="true" />キャラクター一覧へ</Link><section className="mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#f7effb] via-white to-[#fff0f5] p-6 sm:p-10"><div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center"><CharacterAvatar character={character} size="lg" /><div><p className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-pink"><Sparkles size={14} aria-hidden="true" />CHARACTER PROFILE</p><h1 className="mt-3 font-display text-4xl font-semibold text-ink sm:text-5xl">{character.name}</h1><p className="mt-3 max-w-xl text-sm leading-7 text-ink/65">{character.description}</p>{character.isFanStudioRegular && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-lavender shadow-soft"><CalendarDays size={14} aria-hidden="true" />ファンスタジオで毎日会える案内あり</p>}</div></div></section><section className="pt-12"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-xs font-black tracking-[0.18em] text-pink">UPCOMING GREETINGS</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">直近のグリーティング予定</h2></div><p className="text-xs font-bold text-ink/45">情報更新日：2026/07/21（サンプル）</p></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{characterSchedules.map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} scheduleCharacters={getCharactersForSchedule(schedule)} compact />)}</div></section><section className="mt-10 rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft"><h2 className="font-black text-ink">公式プロフィール</h2><p className="mt-2 text-sm leading-6 text-ink/60">最新のプロフィールや登場情報は公式サイトでご確認ください。</p><a href={character.officialUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-pink hover:underline">公式サイトを確認する <ExternalLink size={15} aria-hidden="true" /></a></section><div className="mt-8"><OfficialNotice /></div></div>;
}
