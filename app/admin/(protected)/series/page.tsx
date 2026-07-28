import type { Metadata } from "next";
import { SeriesManager } from "@/components/admin/series-manager";
import { listArticleSeries } from "@/lib/articles/series-repository";

export const metadata: Metadata = {
  title: "記事シリーズ",
  description: "連載記事のシリーズを管理します。",
};

export const dynamic = "force-dynamic";

export default async function AdminSeriesPage() {
  let setupError = "";
  let series: Awaited<ReturnType<typeof listArticleSeries>> = [];
  try {
    series = await listArticleSeries();
  } catch {
    setupError = "シリーズ機能を利用するには、最新のarticle_seriesマイグレーションを適用してください。";
  }
  return <SeriesManager initialSeries={series} setupError={setupError} />;
}
