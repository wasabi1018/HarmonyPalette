import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Map, MapPin, Timer } from "lucide-react";
import { OfficialNotice } from "@/components/official-notice";
import { spots } from "@/data/site-data";

export function generateStaticParams() { return spots.map((spot) => ({ slug: spot.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const spot = spots.find((item) => item.slug === slug);
  return spot ? { title: spot.name, description: spot.description, alternates: { canonical: `/around/${spot.slug}` } } : {};
}

export default async function AroundDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spot = spots.find((item) => item.slug === slug);
  if (!spot) notFound();
  return <div className="mx-auto max-w-[1000px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12"><Link href="/around" className="inline-flex items-center gap-2 text-sm font-black text-pink hover:underline"><ArrowLeft size={16} aria-hidden="true" />周辺情報へ戻る</Link><section className="mt-6 rounded-[32px] bg-gradient-to-br from-[#eef9f4] via-white to-[#eef8fc] p-6 sm:p-10"><p className="text-xs font-black tracking-[0.18em] text-sky">AROUND HARMONYLAND</p><p className="mt-4 inline-flex rounded-full bg-white px-3 py-2 text-xs font-black text-sky shadow-soft">{spot.category}</p><h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-5xl">{spot.name}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-ink/65">{spot.description}</p></section><section className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft"><p className="text-xs font-black text-sky">アクセス目安</p><p className="mt-2 inline-flex items-center gap-2 font-black text-ink"><Timer size={17} aria-hidden="true" />ハーモニーランドから車で約{spot.driveTimeMinutes}分</p><p className="mt-2 text-sm text-ink/55">{spot.address}</p></div><div className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft"><p className="text-xs font-black text-sky">料金目安</p><p className="mt-2 font-black text-ink">{spot.priceRange}</p><p className="mt-2 text-xs leading-6 text-ink/55">実際の料金・営業時間は各施設へご確認ください。</p></div></section><section className="mt-8 rounded-[24px] border border-pink/10 bg-white p-6 shadow-soft"><h2 className="font-black text-ink">子ども連れ向け情報</h2><p className="mt-3 text-sm leading-7 text-ink/65">{spot.childFriendlyInfo}</p><div className="mt-6 flex flex-wrap gap-3"><a href={spot.mapUrl} className="inline-flex items-center gap-2 rounded-full bg-sky px-5 py-3 text-sm font-black text-white"><Map size={16} aria-hidden="true" />地図を見る</a><a href={spot.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ink/10 px-5 py-3 text-sm font-black text-ink hover:border-pink/30 hover:text-pink">公式情報 <ExternalLink size={15} aria-hidden="true" /></a></div><p className="mt-5 flex items-center gap-2 border-t border-pink/10 pt-4 text-xs font-bold text-ink/45"><MapPin size={14} aria-hidden="true" />予約リンクや地図リンクは、公開時に公式URLへ差し替えます。</p></section><div className="mt-8"><OfficialNotice /></div></div>;
}
