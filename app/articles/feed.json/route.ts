import { listPublishedArticles } from "@/lib/articles/repository";

export const dynamic = "force-dynamic";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://harmony-palette.example")
  .replace(/\/+$/, "");

function absoluteUrl(value: string) {
  return value ? new URL(value, `${siteUrl}/`).toString() : undefined;
}

export async function GET() {
  const articles = await listPublishedArticles({ destination: "articles", limit: 50 });
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Harmony Palette 記事",
    home_page_url: `${siteUrl}/articles`,
    feed_url: `${siteUrl}/articles/feed.json`,
    description: "ハーモニーランドのおでかけ準備や楽しみ方を紹介する記事です。",
    language: "ja",
    items: articles.map((article) => {
      const url = `${siteUrl}/articles/${encodeURIComponent(article.slug)}`;
      return {
        id: url,
        url,
        title: article.title,
        summary: article.excerpt,
        image: absoluteUrl(article.coverImageUrl),
        date_published: article.publishedAt || article.updatedAt,
        date_modified: article.updatedAt,
        tags: article.tags.map((tag) => tag.name),
      };
    }),
  };

  return Response.json(feed, {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
