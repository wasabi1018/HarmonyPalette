import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { ArticleIndex } from "@/components/article-index";
import { OfficialNotice } from "@/components/official-notice";
import { PageIntro } from "@/components/page-intro";
import { listPublishedArticles } from "@/lib/articles/repository";
import { listPublishedArticleSeries } from "@/lib/articles/series-repository";

export const revalidate = 300;

const loadArticleIndexData = unstable_cache(
  () => Promise.all([
    listPublishedArticles().catch(() => []),
    listPublishedArticleSeries().catch(() => []),
  ]),
  ["article-index-v2"],
  { revalidate: 300 },
);

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ tag?: string; q?: string; page?: string }>;
}): Promise<Metadata> {
  const { tag, q, page } = await searchParams;
  const filtered = Boolean(tag || q || (page && page !== "1"));
  return {
    title: q ? `「${q.slice(0, 40)}」の記事検索` : "最新記事",
    description: "初めての方向けガイドから最新のおでかけ情報まで、ハーモニーランドを楽しむための記事をまとめています。",
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

export default async function ArticlesPage({ searchParams }: {
  searchParams: Promise<{ tag?: string; q?: string; page?: string }>;
}) {
  const { tag = "", q = "", page: pageParam = "1" } = await searchParams;
  const initialQuery = q.normalize("NFKC").trim().slice(0, 80);
  const requestedPage = Number(pageParam);
  const initialPage = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const [articles, series] = await loadArticleIndexData();
  const articleItems = articles.map(({ id, title, slug, excerpt, coverImageUrl, destination, publishedAt, tags }) => ({
    id, title, slug, excerpt, coverImageUrl, destination, publishedAt, tags,
  }));
  const seriesItems = series.map(({ id, title, slug, articleCount }) => ({ id, title, slug, articleCount }));

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <PageIntro
        eyebrow="JOURNAL"
        title="おでかけのヒントを読む。"
        description="初めての方向けガイドも、季節の楽しみ方も。ハーモニーランドのおでかけ情報を、ひとつの場所にまとめました。"
        tone="pink"
      />
      <ArticleIndex articles={articleItems} series={seriesItems} initialQuery={initialQuery} initialTag={tag} initialPage={initialPage} />
      <div className="mt-10"><OfficialNotice /></div>
    </div>
  );
}
