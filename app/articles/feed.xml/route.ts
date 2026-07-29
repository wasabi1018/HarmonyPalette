import { listPublishedArticles } from "@/lib/articles/repository";

export const dynamic = "force-dynamic";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://harmony-palette.example")
  .replace(/\/+$/, "");

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character] || character);
}

export async function GET() {
  const articles = await listPublishedArticles({ destination: "articles", limit: 50 });
  const items = articles.map((article) => {
    const url = `${siteUrl}/articles/${encodeURIComponent(article.slug)}`;
    const publishedAt = article.publishedAt || article.updatedAt;
    return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(article.excerpt)}</description>
      <pubDate>${new Date(publishedAt).toUTCString()}</pubDate>
${article.tags.map((tag) => `      <category>${escapeXml(tag.name)}</category>`).join("\n")}
    </item>`;
  }).join("\n");
  const latestDate = articles[0]?.updatedAt
    ? new Date(articles[0].updatedAt).toUTCString()
    : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Harmony Palette 記事</title>
    <link>${escapeXml(`${siteUrl}/articles`)}</link>
    <description>ハーモニーランドのおでかけ準備や楽しみ方を紹介する記事です。</description>
    <language>ja</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    <atom:link href="${escapeXml(`${siteUrl}/articles/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
