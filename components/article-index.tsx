"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookCopy, BookOpen, CalendarDays, Rss, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ArticleSeries, ArticleSummary } from "@/lib/articles/types";
import { publicArticleImageUrl } from "@/lib/articles/media-url";

const PAGE_SIZE = 9;

export type ArticleIndexItem = Pick<
  ArticleSummary,
  "id" | "title" | "slug" | "excerpt" | "coverImageUrl" | "destination" | "publishedAt" | "tags"
>;
export type ArticleIndexSeries = Pick<ArticleSeries, "id" | "title" | "slug" | "articleCount">;

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function readLocation() {
  const params = new URLSearchParams(window.location.search);
  const requestedPage = Number(params.get("page") || "1");
  return {
    query: (params.get("q") || "").normalize("NFKC").trim().slice(0, 80),
    tag: params.get("tag") || "",
    page: Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1,
  };
}

function articleIndexUrl(query: string, tag: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/articles?${search}` : "/articles";
}

export function ArticleIndex({ articles, series, initialQuery, initialTag, initialPage }: {
  articles: ArticleIndexItem[];
  series: ArticleIndexSeries[];
  initialQuery: string;
  initialTag: string;
  initialPage: number;
}) {
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag);
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const syncFromHistory = () => {
      const next = readLocation();
      setQueryInput(next.query);
      setQuery(next.query);
      setTag(next.tag);
      setPage(next.page);
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  const tags = useMemo(() => Array.from(new Map(
    articles.flatMap((article) => article.tags).map((item) => [item.slug, item]),
  ).values()), [articles]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase("ja");
    return articles.filter((article) => (
      (!tag || article.tags.some((item) => item.slug === tag))
      && (!normalizedQuery || `${article.title} ${article.excerpt}`.toLocaleLowerCase("ja").includes(normalizedQuery))
    ));
  }, [articles, query, tag]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = totalPages ? Math.min(page, totalPages) : 1;
  const visibleArticles = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateFilters(next: { query?: string; tag?: string; page?: number }) {
    const nextQuery = next.query ?? query;
    const nextTag = next.tag ?? tag;
    const nextPage = next.page ?? 1;
    setQuery(nextQuery);
    setQueryInput(nextQuery);
    setTag(nextTag);
    setPage(nextPage);
    window.history.pushState(null, "", articleIndexUrl(nextQuery, nextTag, nextPage));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ query: queryInput.normalize("NFKC").trim().slice(0, 80), page: 1 });
  }

  return <>
    <div className="mt-4 flex justify-end">
      <Link href="/articles/feed.xml" className="inline-flex items-center gap-2 text-[10px] font-black text-ink/35 transition hover:text-pink">
        <Rss size={13} aria-hidden="true" />RSSで新着記事を購読
      </Link>
    </div>

    {series.length > 0 && <section className="mt-6 rounded-2xl border border-pink/10 bg-white p-4 shadow-soft sm:p-5">
      <p className="flex items-center gap-2 text-[10px] font-black text-ink/55"><BookCopy size={15} className="text-pink" aria-hidden="true" />記事シリーズ</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {series.map((item) => <Link key={item.id} href={`/articles/series/${item.slug}`} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-pink/15 bg-pink/[0.03] px-3.5 text-[10px] font-black text-ink/55 transition hover:border-pink/30 hover:text-pink">
          {item.title}<span className="text-[8px] text-ink/30">{item.articleCount || 0}記事</span>
        </Link>)}
      </div>
    </section>}

    <form onSubmit={submitSearch} className="mt-7 flex flex-col gap-2 sm:flex-row">
      <label className="relative block min-w-0 flex-1">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" aria-hidden="true" />
        <input type="search" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} maxLength={80} placeholder="タイトル・紹介文から記事を検索" className="min-h-12 w-full rounded-2xl border border-pink/15 bg-white pl-11 pr-11 text-[12px] font-bold text-ink shadow-soft outline-none placeholder:text-ink/30 focus:border-pink" />
        {queryInput && <button type="button" onClick={() => updateFilters({ query: "", page: 1 })} aria-label="検索条件をクリア" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-ink/30 hover:bg-pink/[0.05] hover:text-pink"><X size={15} aria-hidden="true" /></button>}
      </label>
      <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-pink px-6 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(235,110,152,0.2)]"><Search size={15} aria-hidden="true" />検索</button>
    </form>

    {(tags.length > 0 || tag) && <nav aria-label="記事タグ" className="mt-7 flex flex-wrap gap-2">
      <button type="button" onClick={() => updateFilters({ tag: "", page: 1 })} aria-pressed={!tag} className={`rounded-full px-4 py-2 text-[11px] font-black transition ${!tag ? "bg-pink text-white" : "border border-pink/15 bg-white text-ink/50 hover:text-pink"}`}>すべて</button>
      {tags.map((item) => <button type="button" key={item.id} onClick={() => updateFilters({ tag: item.slug, page: 1 })} aria-pressed={tag === item.slug} className="rounded-full border px-4 py-2 text-[11px] font-black transition hover:-translate-y-0.5" style={{ color: item.color, borderColor: `${item.color}33`, backgroundColor: tag === item.slug ? `${item.color}18` : "#fff" }}>{item.name}</button>)}
    </nav>}

    {(query || tag) && <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-ink/40" aria-live="polite">
      <p>{filtered.length.toLocaleString("ja-JP")}件の記事{query && <>・「{query}」の検索結果</>}</p>
      <button type="button" onClick={() => updateFilters({ query: "", tag: "", page: 1 })} className="font-black text-pink hover:underline">条件をすべて解除</button>
    </div>}

    {visibleArticles.length > 0 ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visibleArticles.map((article) => <article key={article.id} className="group overflow-hidden rounded-[26px] border border-pink/10 bg-white shadow-soft">
        <Link href={`/articles/${article.slug}`} className="block">
          <div className="aspect-[16/8] overflow-hidden bg-[#fff0f5]">
            {article.coverImageUrl ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicArticleImageUrl(article.coverImageUrl)} alt={`${article.title}のアイキャッチ画像`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
            </> : <span className="grid h-full place-items-center text-pink/40"><BookOpen size={32} aria-hidden="true" /></span>}
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex min-h-5 flex-wrap gap-2">
              {article.destination === "guide" && <span className="rounded-full bg-[#fff0c9] px-2.5 py-1 text-[9px] font-black text-[#a66d0a]">初めての方向け</span>}
              {article.tags.map((item) => <span key={item.id} className="rounded-full px-2.5 py-1 text-[9px] font-black" style={{ color: item.color, backgroundColor: `${item.color}14` }}>{item.name}</span>)}
            </div>
            <h2 className="mt-4 font-display text-[21px] font-semibold leading-8 text-ink transition group-hover:text-pink">{article.title}</h2>
            {article.excerpt && <p className="mt-3 line-clamp-2 text-[13px] font-bold leading-6 text-ink/55">{article.excerpt}</p>}
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold text-ink/35"><CalendarDays size={13} aria-hidden="true" />{formatDate(article.publishedAt)}</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-pink">続きを読む<ArrowRight size={13} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </div>
          </div>
        </Link>
      </article>)}
    </div> : <div className="mt-8 rounded-[26px] border border-pink/10 bg-white px-6 py-16 text-center shadow-soft">
      <BookOpen size={30} className="mx-auto text-pink/35" aria-hidden="true" /><h2 className="mt-4 text-[15px] font-black text-ink/55">条件に一致する記事がありません</h2><p className="mt-2 text-[12px] font-bold leading-6 text-ink/40">別のタグやキーワードをお試しください。</p>
    </div>}

    {totalPages > 1 && <nav aria-label="記事一覧のページ" className="mt-8 flex items-center justify-center gap-3">
      {safePage > 1 ? <button type="button" onClick={() => updateFilters({ page: safePage - 1 })} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink/15 bg-white px-4 text-[10px] font-black text-ink/50 hover:text-pink"><ArrowLeft size={13} aria-hidden="true" />前へ</button> : <span className="w-[76px]" />}
      <span className="text-[10px] font-black text-ink/40">{safePage} / {totalPages}</span>
      {safePage < totalPages ? <button type="button" onClick={() => updateFilters({ page: safePage + 1 })} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink/15 bg-white px-4 text-[10px] font-black text-ink/50 hover:text-pink">次へ<ArrowRight size={13} aria-hidden="true" /></button> : <span className="w-[76px]" />}
    </nav>}
  </>;
}
