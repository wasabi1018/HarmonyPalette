import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import type { ArticleSummary } from "@/lib/articles/types";
import type { InstagramPostUrls } from "@/data/instagram-posts";
import type { InitialCharacterData } from "@/lib/character-store";
import type { InitialParkOperatingDayData } from "@/lib/park-operating-day-store";
import type { InitialScheduleData } from "@/lib/schedule-store";
import { HomeBirthdayRibbon } from "./home-birthday-ribbon";
import { HomeTodaySections } from "./home-today-sections";
import { FirstVisitGuideLink } from "./first-visit-guide-link";
import { InstagramEmbedSection } from "./instagram-embed-section";
import { SectionHeading } from "./section-heading";

function Hero() {
  return (
    <section className="border-b border-pink/10 bg-[#fff8fb]">
      <div className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto max-w-[820px] lg:text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-pink/20 bg-white px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-pink shadow-soft">
            <Sparkles size={13} aria-hidden="true" />
            HARMONYLAND FAN GUIDE
          </p>
          <h1 className="mx-auto mt-4 max-w-[680px] overflow-hidden rounded-[22px] border border-pink/10 bg-white p-3 shadow-soft sm:p-4">
            <Image
              src="/logo-hero.png"
              alt="Harmony Palette"
              width={2172}
              height={724}
              priority
              className="h-auto w-full object-contain"
              sizes="(max-width: 768px) calc(100vw - 56px), 680px"
            />
          </h1>
          <p className="mt-4 max-w-[650px] text-[14px] font-medium leading-6 text-ink/65 sm:text-[15px] sm:leading-7 lg:mx-auto">
            キャラクターの登場予定、次のグリーティング、旅の準備まで。
            ハーモニーランドを楽しむ情報を、見やすくひとつにまとめました。
          </p>
          <div className="mt-5 flex flex-wrap gap-2 lg:justify-center">
            <Link
              href="#today-schedule"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-pink px-4 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(235,110,152,0.22)] transition-transform hover:-translate-y-0.5 sm:px-5 sm:text-sm"
            >
              今日の予定
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/schedule"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-pink/20 bg-white px-4 text-[13px] font-black text-ink transition-colors hover:border-pink/50 hover:text-pink sm:px-5 sm:text-sm"
            >
              キャラクターから探す
            </Link>
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-ink/45 lg:justify-center">
            <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
            公開済みスケジュールを表示
            <span className="text-ink/20">|</span>
            最新情報は公式サイトもご確認ください
          </p>
        </div>

      </div>
    </section>
  );
}

function formatArticleDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function JournalSection({
  latestArticles,
  instagramPostUrls,
}: {
  latestArticles: ArticleSummary[];
  instagramPostUrls: InstagramPostUrls;
}) {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-4 pt-12 sm:px-6 lg:px-8">
      <FirstVisitGuideLink />

      <div className="mt-10">
        <SectionHeading
          eyebrow="LATEST ARTICLES"
          title="最新記事"
          href="/articles"
          linkLabel="記事をもっと見る"
        />
      </div>
      {latestArticles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {latestArticles.map((article) => (
            <article
              key={article.id}
              className="group overflow-hidden rounded-[24px] border border-pink/10 bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-card"
            >
              <Link href={`/articles/${article.slug}`} className="block h-full">
                <div className="aspect-[16/8] overflow-hidden bg-[#fff0f5]">
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.coverImageUrl}
                      alt={`${article.title}のアイキャッチ画像`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-pink/35">
                      <BookOpen size={30} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex min-h-5 flex-wrap gap-1.5">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-2.5 py-1 text-[8px] font-black"
                        style={{ color: tag.color, backgroundColor: `${tag.color}14` }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-[19px] font-semibold leading-7 text-ink transition-colors group-hover:text-pink">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="mt-2 line-clamp-2 text-[11px] font-bold leading-5 text-ink/50">
                      {article.excerpt}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[9px] font-bold text-ink/35">
                    <CalendarDays size={12} aria-hidden="true" />
                    {formatArticleDate(article.publishedAt)}
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-pink/20 bg-white px-5 py-10 text-center">
          <BookOpen size={26} className="mx-auto text-pink/30" aria-hidden="true" />
          <p className="mt-3 text-[12px] font-black text-ink/45">最新記事を準備しています。</p>
        </div>
      )}
      <InstagramEmbedSection postUrls={instagramPostUrls} />
    </section>
  );
}

export function HomeSections({
  latestArticles,
  instagramPostUrls,
  initialScheduleData,
  initialCharacterData,
  initialOperatingDayData,
}: {
  latestArticles: ArticleSummary[];
  instagramPostUrls: InstagramPostUrls;
  initialScheduleData: InitialScheduleData;
  initialCharacterData: InitialCharacterData;
  initialOperatingDayData: InitialParkOperatingDayData;
}) {
  return (
    <>
      <Hero />
      <HomeBirthdayRibbon initialCharacterData={initialCharacterData} />
      <HomeTodaySections
        initialScheduleData={initialScheduleData}
        initialCharacterData={initialCharacterData}
        initialOperatingDayData={initialOperatingDayData}
      />
      <JournalSection
        latestArticles={latestArticles}
        instagramPostUrls={instagramPostUrls}
      />
    </>
  );
}
