import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import type { ArticleSummary } from "@/lib/articles/types";
import { publicArticleImageUrl } from "@/lib/articles/media-url";
import type { InstagramPostUrls } from "@/data/instagram-posts";
import type { InitialCharacterData } from "@/lib/character-store";
import type { InitialParkOperatingDayData } from "@/lib/park-operating-day-store";
import type { InitialScheduleData } from "@/lib/schedule-store";
import type { HomepageGuideCard } from "@/lib/homepage-guide-cards";
import { HomeBirthdayRibbon } from "./home-birthday-ribbon";
import { HomeTodayOverview } from "./home-today-overview";
import { HomeTodaySections } from "./home-today-sections";
import { HomepageGuideCards } from "./homepage-guide-cards";
import { InstagramEmbedSection } from "./instagram-embed-section";
import { SectionHeading } from "./section-heading";

function formatArticleDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

function LatestArticles({ articles }: { articles: ArticleSummary[] }) {
  return (
    <section aria-labelledby="home-latest-heading" className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 md:py-7 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="home-latest-heading" className="text-[22px] font-black text-ink sm:text-[26px]">最新記事</h2>
        <Link href="/articles" className="inline-flex min-h-11 items-center gap-1 text-[12px] font-bold text-[#b43e68] hover:underline">記事一覧を見る<ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
      {articles.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 md:gap-6">
          {articles.slice(0, 2).map((article) => (
            <article key={article.id}>
              <Link href={`/articles/${article.slug}`} className="group grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink md:block">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#fff0f5] md:aspect-[16/7]">
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicArticleImageUrl(article.coverImageUrl)} alt={`${article.title}のアイキャッチ画像`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                  ) : <span className="grid h-full place-items-center text-pink/60"><BookOpen size={28} aria-hidden="true" /></span>}
                </div>
                <div className="min-w-0 md:pt-3">
                  <h3 className="line-clamp-3 text-[14px] font-black leading-6 text-ink group-hover:text-[#b43e68] md:line-clamp-2 md:text-[18px] md:leading-7">{article.title}</h3>
                  {article.excerpt && <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink/70 md:mt-2 md:leading-6">{article.excerpt}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5 text-ink/70">
                    {article.tags.slice(0, 1).map((tag) => <span key={tag.id} className="rounded-full bg-pink/[0.08] px-2 py-0.5 font-bold text-ink/70">{tag.name}</span>)}
                    {article.publishedAt && <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" /><time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time></span>}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : <p className="rounded-xl border border-dashed border-pink/20 px-4 py-6 text-sm text-ink/70">最新記事を準備しています。</p>}
    </section>
  );
}

export function HomeSections({ latestArticles, instagramPostUrls, guideCards, initialScheduleData, initialCharacterData, initialOperatingDayData }: {
  latestArticles: ArticleSummary[];
  instagramPostUrls: InstagramPostUrls;
  guideCards: HomepageGuideCard[];
  initialScheduleData: InitialScheduleData;
  initialCharacterData: InitialCharacterData;
  initialOperatingDayData: InitialParkOperatingDayData;
}) {
  return (
    <>
      <h1 className="sr-only">Harmony Palette</h1>
      <HomeTodayOverview initialScheduleData={initialScheduleData} initialOperatingDayData={initialOperatingDayData} />
      <LatestArticles articles={latestArticles} />
      <HomeBirthdayRibbon initialCharacterData={initialCharacterData} />
      <HomeTodaySections initialScheduleData={initialScheduleData} initialCharacterData={initialCharacterData} initialOperatingDayData={initialOperatingDayData} />
      <section aria-label="来園に役立つガイド" className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 lg:px-8">
        <SectionHeading title="来園に役立つガイド" />
        <HomepageGuideCards cards={guideCards} />
      </section>
      <section className="mx-auto max-w-[1200px] px-4 pb-6 pt-10 sm:px-6 lg:px-8">
        <InstagramEmbedSection postUrls={instagramPostUrls} />
        <div id="home-about" className="mt-10 rounded-2xl border border-pink/10 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-black text-ink">Harmony Paletteについて</h2>
          <p className="mt-3 max-w-[750px] text-sm leading-7 text-ink/70">月に複数回ハーモニーランドへ通う家族が、実際の来園経験をもとに記事を公開しています。予定は公式の公開情報を確認して整理しています。</p>
          <Link href="/about" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#b43e68] hover:underline">運営者・編集方針を見る<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}
