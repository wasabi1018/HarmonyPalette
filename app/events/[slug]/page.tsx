import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { OfficialNotice } from "@/components/official-notice";
import { events, characters } from "@/data/site-data";

export function generateStaticParams() { return events.map((event) => ({ slug: event.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = events.find((item) => item.slug === slug);
  return event ? { title: event.title, description: event.description, alternates: { canonical: `/events/${event.slug}` } } : {};
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = events.find((item) => item.slug === slug);
  if (!event) notFound();
  const eventCharacters = event.characterIds.map((id) => characters.find((character) => character.id === id)).filter(Boolean);
  return <div className="mx-auto max-w-[1000px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12"><Link href="/events" className="inline-flex items-center gap-2 text-sm font-black text-pink hover:underline"><ArrowLeft size={16} aria-hidden="true" />イベント一覧へ</Link><section className="mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#fff0f5] via-white to-[#f3effa] p-6 sm:p-10"><p className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-pink"><Sparkles size={14} aria-hidden="true" />EVENT DETAIL</p><h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-5xl">{event.title}</h1><span className="mt-5 inline-flex rounded-full bg-mint/15 px-3 py-2 text-xs font-black text-[#38866B]">{event.status}</span></section><section className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft"><p className="text-xs font-black text-pink">開催期間</p><p className="mt-2 inline-flex items-center gap-2 font-black text-ink"><CalendarDays size={17} aria-hidden="true" />{event.startDate}〜{event.endDate}</p></div><div className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft"><p className="text-xs font-black text-pink">開催場所</p><p className="mt-2 inline-flex items-center gap-2 font-black text-ink"><MapPin size={17} aria-hidden="true" />{event.location}</p></div></section><section className="mt-8 rounded-[24px] border border-pink/10 bg-white p-6 shadow-soft"><h2 className="font-black text-ink">イベント概要</h2><p className="mt-3 text-sm leading-7 text-ink/65">{event.description}</p><p className="mt-5 text-xs font-bold text-ink/45">対象キャラクター：{eventCharacters.map((character) => character?.name).join("・") || "確認中"}</p><a href={event.officialUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-pink hover:underline">公式情報を確認する <ExternalLink size={15} aria-hidden="true" /></a><p className="mt-5 border-t border-pink/10 pt-4 text-xs font-bold leading-6 text-ink/45">情報更新日：{event.updatedAt}（サンプル）<br />注意事項や開催内容は変更される場合があります。来園前に公式情報をご確認ください。</p></section><div className="mt-8"><OfficialNotice /></div></div>;
}
