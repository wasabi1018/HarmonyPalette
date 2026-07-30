import { listPublishedArticles } from "@/lib/articles/repository";
import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function absoluteUrl(value: string) {
  return value ? new URL(value, `${SITE_URL}/`).toString() : undefined;
}

export async function GET() {
  const articles = await listPublishedArticles({ destination: "articles", limit: 50 });
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Harmony Palette 記事",
    home_page_url: `${SITE_URL}/articles`,
    feed_url: `${SITE_URL}/articles/feed.json`,
    description: "ハーモニーランドのおでかけ準備や楽しみ方を紹介する記事です。",
    language: "ja",
    items: articles.map((article) => {
      const url = `${SITE_URL}/articles/${encodeURIComponent(article.slug)}`;
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
