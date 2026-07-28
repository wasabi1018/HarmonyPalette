import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Sparkles,
  Ticket,
  TrainFront,
  Users,
  Utensils,
  Waves,
} from "lucide-react";
import { events, spots } from "@/data/site-data";
import { formatDate } from "@/lib/format";
import { HomeBirthdayRibbon } from "./home-birthday-ribbon";
import { HomeHeroStats } from "./home-hero-stats";
import { HomeTodaySections } from "./home-today-sections";
import { OfficialNotice } from "./official-notice";
import { SectionHeading } from "./section-heading";

function Hero() {
  return (
    <section className="border-b border-pink/10 bg-[#fff8fb]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-7 px-4 py-7 sm:px-6 sm:py-9 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:px-8">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-pink/20 bg-white px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-pink shadow-soft">
            <Sparkles size={13} aria-hidden="true" />
            HARMONYLAND FAN GUIDE
          </p>
          <h1 className="mt-4 max-w-[620px] font-display text-[34px] font-semibold leading-[1.22] tracking-[-0.045em] text-ink sm:text-[44px] lg:text-[50px]">
            今日の<span className="text-pink">「会いたい」</span>が、
            <br className="hidden sm:block" />
            すぐ見つかる。
          </h1>
          <p className="mt-4 max-w-[590px] text-[14px] font-medium leading-6 text-ink/65 sm:text-[15px] sm:leading-7">
            キャラクターの登場予定、次のグリーティング、旅の準備まで。
            ハーモニーランドを楽しむ情報を、見やすくひとつにまとめました。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/schedule"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-pink px-4 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(235,110,152,0.22)] transition-transform hover:-translate-y-0.5 sm:px-5 sm:text-sm"
            >
              今日の予定
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/characters"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-pink/20 bg-white px-4 text-[13px] font-black text-ink transition-colors hover:border-pink/50 hover:text-pink sm:px-5 sm:text-sm"
            >
              キャラクターから探す
            </Link>
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-ink/45">
            <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
            公開済みスケジュールを表示
            <span className="text-ink/20">|</span>
            最新情報は公式サイトもご確認ください
          </p>
        </div>

        <aside className="overflow-hidden rounded-[24px] border border-pink/15 bg-white p-2.5 shadow-card sm:p-4" aria-label="今日の概要">
          <div className="relative aspect-[16/6] overflow-hidden rounded-[18px] bg-[#fffdfd] sm:aspect-[16/7]">
            <Image
              src="/logo-hero.png"
              alt="Harmony Palette ロゴ"
              fill
              priority
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          </div>
          <HomeHeroStats />
        </aside>
      </div>
    </section>
  );
}

function ExploreCards() {
  const cards = [
    {
      title: "キャラクターから探す",
      text: "会いたいキャラクターの予定をチェック",
      href: "/characters",
      icon: Users,
      color: "bg-[#fff0f5] text-pink",
    },
    {
      title: "初めての方へ",
      text: "チケット・アクセス・子連れの回り方",
      href: "/guide",
      icon: Ticket,
      color: "bg-[#fff5d9] text-[#c58b22]",
    },
    {
      title: "周辺情報",
      text: "ホテル・温泉・グルメも一緒に計画",
      href: "/around",
      icon: Compass,
      color: "bg-[#eef9f4] text-[#53a687]",
    },
  ];

  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-12 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="PLAN YOUR VISIT" title="おでかけの準備" />
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(({ icon: Icon, ...card }) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-center gap-4 rounded-[20px] border border-pink/10 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-card"
          >
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${card.color}`}>
              <Icon size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-ink">{card.title}</h3>
              <p className="mt-1 text-xs leading-5 text-ink/50">{card.text}</p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-pink" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function NewsAndTrip() {
  return (
    <section className="mx-auto grid min-w-0 max-w-[1200px] grid-cols-1 gap-8 px-4 pt-12 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
      <div className="min-w-0">
        <SectionHeading eyebrow="LATEST TOPICS" title="最新イベント" href="/events" />
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="group mb-3 flex gap-3 rounded-[20px] border border-pink/10 bg-white p-3.5 shadow-soft transition-shadow hover:border-pink/30 hover:shadow-card sm:p-4"
          >
            <div className="grid h-16 w-20 shrink-0 place-items-center rounded-2xl bg-[#fff0f5] text-pink sm:h-20 sm:w-24">
              <CalendarDays size={23} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${event.status === "開催中" ? "bg-mint/15 text-[#38866B]" : "bg-lavender/15 text-lavender"}`}>
                  {event.status}
                </span>
                <span className="text-[11px] font-bold text-ink/45">{formatDate(event.startDate)}〜</span>
              </div>
              <h3 className="mt-2 truncate text-sm font-black text-ink group-hover:text-pink sm:text-[15px]">
                {event.title}
              </h3>
              <p className="mt-1 line-clamp-1 text-[11px] text-ink/50">{event.description}</p>
            </div>
            <ArrowRight className="mt-6 shrink-0 text-pink" size={17} aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="min-w-0">
        <SectionHeading eyebrow="STAY & DISCOVER" title="周辺ホテル・観光" href="/around" />
        {spots.map((spot) => (
          <Link
            key={spot.id}
            href={`/around/${spot.slug}`}
            className="group mb-3 block rounded-[20px] border border-pink/10 bg-white p-3.5 shadow-soft transition-shadow hover:border-pink/30 hover:shadow-card sm:p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eef8fc] text-sky">
                  <Compass size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-sky">{spot.category}</p>
                  <h3 className="mt-0.5 truncate text-sm font-black text-ink group-hover:text-pink">
                    {spot.name}
                  </h3>
                </div>
              </div>
              <ArrowRight size={16} className="shrink-0 text-pink" aria-hidden="true" />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-bold text-ink/50">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} aria-hidden="true" />
                {spot.address}
              </span>
              <span className="inline-flex items-center gap-1">
                <TrainFront size={13} aria-hidden="true" />
                車で約{spot.driveTimeMinutes}分
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FinalNotes() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-4 pt-12 sm:px-6 lg:px-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-[#fff5d9] p-4">
          <Ticket className="text-[#c58b22]" size={21} aria-hidden="true" />
          <h3 className="mt-3 text-sm font-black text-ink">チケット・営業時間</h3>
          <p className="mt-1 text-xs leading-5 text-ink/55">来園前に公式情報をチェック。</p>
        </div>
        <div className="rounded-[20px] bg-[#eef9f4] p-4">
          <Utensils className="text-[#53a687]" size={21} aria-hidden="true" />
          <h3 className="mt-3 text-sm font-black text-ink">家族で楽しむヒント</h3>
          <p className="mt-1 text-xs leading-5 text-ink/55">子ども連れの過ごし方を紹介予定。</p>
        </div>
        <div className="rounded-[20px] bg-[#f3effa] p-4">
          <Waves className="text-lavender" size={21} aria-hidden="true" />
          <h3 className="mt-3 text-sm font-black text-ink">旅の前後も楽しむ</h3>
          <p className="mt-1 text-xs leading-5 text-ink/55">温泉や周辺観光を組み合わせよう。</p>
        </div>
      </div>
      <div className="mt-7">
        <OfficialNotice />
      </div>
    </section>
  );
}

export function HomeSections() {
  return (
    <>
      <Hero />
      <HomeBirthdayRibbon />
      <HomeTodaySections />
      <ExploreCards />
      <NewsAndTrip />
      <FinalNotes />
    </>
  );
}
