import type { Metadata } from "next";
import { ArticleAnalyticsDashboard } from "@/components/admin/article-analytics-dashboard";
import { getArticleAnalytics } from "@/lib/articles/analytics-repository";
import type { ArticleAnalyticsData } from "@/lib/articles/types";

export const metadata: Metadata = {
  title: "サイト分析",
  description: "TOPページ訪問、マイプラン作成、画像保存・共有、記事閲覧の推移を確認します。",
};

export const dynamic = "force-dynamic";

function emptyAnalytics(rangeDays: number): ArticleAnalyticsData {
  return {
    rangeDays,
    totalViews: 0,
    todayViews: 0,
    averageViews: 0,
    homeVisits: 0,
    todayHomeVisits: 0,
    planCreations: 0,
    todayPlanCreations: 0,
    planImageSaves: 0,
    todayPlanImageSaves: 0,
    planShares: 0,
    todayPlanShares: 0,
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
