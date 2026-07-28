import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookCopy,
  BookOpen,
  CalendarDays,
  Rss,
  Search,
  X,
} from "lucide-react";
import { OfficialNotice } from "@/components/official-notice";
import { PageIntro } from "@/components/page-intro";
import {
  listPublishedArticles,
  searchPublishedArticles,
} from "@/lib/articles/repository";
import { listPublishedArticleSeries } from "@/lib/articles/series-repository";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; page?: string }>;
}): Promise<Metadata> {
  const { tag, q, page } = await searchParams;
  const filtered = Boolean(tag || q || (page && page !== "1"));
  return {
    title: q ? `「${q.slice(0, 40)}」の記事検索` : "最新記事",
    description: "ハーモニーランドのおでかけ準備や楽しみ方を紹介する記事ページです。",
    alternates: {
      canonical: "/articles",
      types: {
        "application/rss+xml": "/articles/feed.xml",
        "application/feed+json": "/articles/feed.json",
      },
    },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function articlesUrl({
  query = "",
  tag = "",
  page = 1,
}: {
  query?: string;
  tag?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/articles?${search}` : "/articles";
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; page?: string }>;
}) {
  const { tag = "", q = "", page: pageParam = "1" } = await searchParams;
  const query = q.normalize("NFKC").trim().slice(0, 80);
  const requestedPage = Number(pageParam);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  let searchResult: Awaited<ReturnType<typeof searchPublishedArticles>> = {
    articles: [],
    total: 0,
    page,
    totalPages: 0,
  };
  let allArticles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  let publishedSeries: Awaited<ReturnType<typeof listPublishedArticleSeries>> = [];
  try {
    [allArticles, publishedSeries] = await Promise.all([
      listPublishedArticles(),
      listPublishedArticleSeries().catch(() => []),
    ]);
  } catch {
    allArticles = [];
  }
  try {
    searchResult = await searchPublishedArticles({ query, tagSlug: tag, page, pageSize: 9 });
  } catch {
    const normalizedQuery = query.toLocaleLowerCase("ja");
    const fallback = allArticles.filter((article) => (
      (!tag || article.tags.some((item) => item.slug === tag))
      && (!normalizedQuery || `${article.title} ${article.excerpt}`
        .toLocaleLowerCase("ja")
        .includes(normalizedQuery))
    ));
    const start = (page - 1) * 9;
    searchResult = {
      articles: fallback.slice(start, start + 9),
      total: fallback.length,
      page,
      totalPages: Math.ceil(fallback.length / 9),
    };
  }
  const articles = searchResult.articles;
  const tags = Array.from(new Map(
    allArticles.flatMap((article) => article.tags).map((item) => [item.slug, item]),
  ).values());

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <PageIntro
        eyebrow="JOURNAL"
        title="おでかけのヒントを読む。"
        description="来園準備や楽しみ方、周辺旅行のヒントを、やさしく読みやすくまとめます。"
        tone="pink"
      />
      <div className="mt-4 flex justify-end">
        <Link
          href="/articles/feed.xml"
          className="inline-flex items-center gap-2 text-[10px] font-black text-ink/35 transition hover:text-pink"
        >
          <Rss size={13} aria-hidden="true" />
          RSSで新着記事を購読
        </Link>
      </div>

      {publishedSeries.length > 0 && (
        <section className="mt-6 rounded-2xl border border-pink/10 bg-white p-4 shadow-soft sm:p-5">
          <p className="flex items-center gap-2 text-[10px] font-black text-ink/55">
            <BookCopy size={15} className="text-pink" aria-hidden="true" />
            記事シリーズ
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {publishedSeries.map((series) => (
              <Link
                key={series.id}
                href={`/articles/series/${series.slug}`}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-pink/15 bg-pink/[0.03] px-3.5 text-[10px] font-black text-ink/55 transition hover:border-pink/30 hover:text-pink"
              >
                {series.title}
                <span className="text-[8px] text-ink/30">{series.articleCount || 0}記事</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <form action="/articles" className="mt-7 flex flex-col gap-2 sm:flex-row">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label className="relative block min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={80}
            placeholder="タイトル・本文から記事を検索"
            className="min-h-12 w-full rounded-2xl border border-pink/15 bg-white pl-11 pr-11 text-[12px] font-bold text-ink shadow-soft outline-none placeholder:text-ink/30 focus:border-pink"
          />
          {query && (
            <Link
              href={articlesUrl({ tag })}
              aria-label="検索条件をクリア"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-ink/30 hover:bg-pink/[0.05] hover:text-pink"
            >
              <X size={15} />
            </Link>
          )}
        </label>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-pink px-6 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(235,110,152,0.2)]"
        >
          <Search size={15} />
          検索
        </button>
      </form>

      {(tags.length > 0 || tag) && (
        <nav aria-label="記事タグ" className="mt-7 flex flex-wrap gap-2">
          <Link
            href={articlesUrl({ query })}
            className={`rounded-full px-4 py-2 text-[11px] font-black transition ${
              !tag ? "bg-pink text-white" : "border border-pink/15 bg-white text-ink/50 hover:text-pink"
            }`}
          >
            すべて
          </Link>
          {tags.map((item) => (
            <Link
              key={item.id}
              href={articlesUrl({ query, tag: item.slug })}
              className="rounded-full border px-4 py-2 text-[11px] font-black transition hover:-translate-y-0.5"
              style={{
                color: item.color,
                borderColor: `${item.color}33`,
                backgroundColor: tag === item.slug ? `${item.color}18` : "#fff",
              }}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      {(query || tag) && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-ink/40">
          <p>
            {searchResult.total.toLocaleString("ja-JP")}件の記事
            {query && <>：「{query}」の検索結果</>}
          </p>
          <Link href="/articles" className="font-black text-pink hover:underline">条件をすべて解除</Link>
        </div>
      )}

      {articles.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <article key={article.id} className="group overflow-hidden rounded-[26px] border border-pink/10 bg-white shadow-soft">
              <Link href={`/articles/${article.slug}`} className="block">
                <div className="aspect-[16/8] overflow-hidden bg-[#fff0f5]">
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.coverImageUrl}
                      alt={`${article.title}のアイキャッチ画像`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-pink/40"><BookOpen size={32} /></span>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full px-2.5 py-1 text-[9px] font-black"
                        style={{ color: item.color, backgroundColor: `${item.color}14` }}
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-4 font-display text-[21px] font-semibold leading-8 text-ink transition group-hover:text-pink">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-3 line-clamp-2 text-[13px] font-bold leading-6 text-ink/55">{article.excerpt}</p>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[10px] font-bold text-ink/35">
                      <CalendarDays size={13} />
                      {formatDate(article.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-pink">
                      続きを読む
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[26px] border border-pink/10 bg-white px-6 py-16 text-center shadow-soft">
          <BookOpen size={30} className="mx-auto text-pink/35" />
          <h2 className="mt-4 text-[15px] font-black text-ink/55">
            {query
              ? "検索条件に一致する記事がありません"
              : tag
                ? "このタグの記事はまだありません"
                : "公開記事はまだありません"}
          </h2>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/40">
            新しいおでかけ情報を準備しています。
          </p>
          {(tag || query) && <Link href="/articles" className="mt-4 inline-flex text-[11px] font-black text-pink hover:underline">すべての記事を見る</Link>}
        </div>
      )}

      {searchResult.totalPages > 1 && (
        <nav aria-label="記事一覧のページ" className="mt-8 flex items-center justify-center gap-3">
          {searchResult.page > 1 ? (
            <Link
              href={articlesUrl({ query, tag, page: searchResult.page - 1 })}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink/15 bg-white px-4 text-[10px] font-black text-ink/50 hover:text-pink"
            >
              <ArrowLeft size={13} />
              前へ
            </Link>
          ) : <span className="w-[76px]" />}
          <span className="text-[10px] font-black text-ink/40">
            {searchResult.page} / {searchResult.totalPages}
          </span>
          {searchResult.page < searchResult.totalPages ? (
            <Link
              href={articlesUrl({ query, tag, page: searchResult.page + 1 })}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink/15 bg-white px-4 text-[10px] font-black text-ink/50 hover:text-pink"
            >
              次へ
              <ArrowRight size={13} />
            </Link>
          ) : <span className="w-[76px]" />}
        </nav>
      )}

      <div className="mt-10"><OfficialNotice /></div>
    </div>
  );
}
