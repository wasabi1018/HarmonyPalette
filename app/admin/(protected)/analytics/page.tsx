import type { Metadata } from "next";
import { ArticleAnalyticsDashboard } from "@/components/admin/article-analytics-dashboard";
import { getArticleAnalytics } from "@/lib/articles/analytics-repository";
import type { ArticleAnalyticsData } from "@/lib/articles/types";

export const metadata: Metadata = {
  title: "記事アクセス分析",
  description: "記事の閲覧推移と人気記事を確認します。",
};

export const dynamic = "force-dynamic";

function emptyAnalytics(rangeDays: number): ArticleAnalyticsData {
  return {
    rangeDays,
    totalViews: 0,
    todayViews: 0,
    averageViews: 0,
    daily: [],
    topArticles: [],
  };
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam = "30" } = await searchParams;
  const requestedDays = Number(daysParam);
  const rangeDays = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  try {
    return <ArticleAnalyticsDashboard data={await getArticleAnalytics(rangeDays)} />;
  } catch {
    return (
      <ArticleAnalyticsDashboard
        data={emptyAnalytics(rangeDays)}
        setupError="アクセス分析を利用するには、Supabaseで最新のマイグレーションを適用してください。"
      />
    );
  }
}
