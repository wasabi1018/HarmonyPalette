"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Download,
  Eye,
  TrendingUp,
} from "lucide-react";
import type { ArticleAnalyticsData } from "@/lib/articles/types";

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export function ArticleAnalyticsDashboard({
  data,
  setupError = "",
}: {
  data: ArticleAnalyticsData;
  setupError?: string;
}) {
  const maxViews = Math.max(...data.daily.map((point) => point.views), 1);

  const downloadCsv = () => {
    const rows = [
      ["日付", "閲覧数"],
      ...data.daily.map((point) => [point.date, String(point.views)]),
      [],
      ["人気記事", "スラッグ", "閲覧数"],
      ...data.topArticles.map((article) => [article.title, article.slug, String(article.views)]),
    ];
    const csv = `\uFEFF${rows.map((row) => (
      row.map((value) => `"${String(value || "").replace(/"/g, "\"\"")}"`).join(",")
    )).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `article-analytics-${data.rangeDays}days.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-pink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
            <BarChart3 size={15} aria-hidden="true" />
            ANALYTICS
          </p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">記事アクセス分析</h1>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
            個人を識別する情報を保存せず、記事ごとの閲覧傾向を確認します。
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={Boolean(setupError)}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-pink/20 bg-white px-4 text-[11px] font-black text-pink hover:bg-pink/[0.04] disabled:opacity-40"
        >
          <Download size={15} aria-hidden="true" />
          CSVを出力
        </button>
      </div>

      {setupError && (
        <p className="mt-5 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold text-[#76582f]">
          {setupError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2" aria-label="集計期間">
        {[7, 30, 90].map((days) => (
          <Link
            key={days}
            href={`/admin/analytics?days=${days}`}
            className={`rounded-full px-4 py-2 text-[10px] font-black transition ${
              data.rangeDays === days
                ? "bg-pink text-white"
                : "border border-pink/15 bg-white text-ink/45 hover:text-pink"
            }`}
          >
            {days}日間
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: `${data.rangeDays}日間の閲覧`, value: data.totalViews, icon: Eye, tone: "text-pink bg-pink/10" },
          { label: "今日の閲覧", value: data.todayViews, icon: CalendarDays, tone: "text-[#5687bd] bg-[#eef5fc]" },
          { label: "1日平均", value: data.averageViews, icon: TrendingUp, tone: "text-[#4d987a] bg-mint/10" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <p className="mt-4 text-[10px] font-black text-ink/40">{label}</p>
            <strong className="mt-1 block font-display text-[30px] font-semibold text-ink">
              {value.toLocaleString("ja-JP")}
            </strong>
          </div>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-black text-ink">日別の閲覧推移</h2>
            <p className="mt-1 text-[9px] font-bold text-ink/35">日本時間の日付で集計</p>
          </div>
          <span className="text-[9px] font-black text-ink/30">最大 {maxViews.toLocaleString("ja-JP")} views</span>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div
            className="flex h-[220px] min-w-max items-end gap-1.5 border-b border-ink/10"
            style={{ width: Math.max(620, data.daily.length * 20) }}
          >
            {data.daily.map((point, index) => (
              <div key={point.date} className="flex h-full min-w-[14px] flex-1 flex-col items-center justify-end">
                <div className="flex h-[176px] w-full items-end">
                  <div
                    title={`${point.date}: ${point.views}件`}
                    className="w-full min-w-[8px] rounded-t-md bg-pink/75 transition hover:bg-pink"
                    style={{ height: point.views ? `${Math.max(6, (point.views / maxViews) * 100)}%` : "2px" }}
                  />
                </div>
                <span className="mt-2 h-4 text-[8px] font-bold text-ink/30">
                  {(data.daily.length <= 7 || index % Math.ceil(data.daily.length / 7) === 0)
                    ? formatShortDate(point.date)
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-soft">
        <div className="border-b border-ink/[0.07] px-5 py-4">
          <h2 className="text-[14px] font-black text-ink">人気記事</h2>
          <p className="mt-1 text-[9px] font-bold text-ink/35">選択期間内の閲覧数順</p>
        </div>
        {data.topArticles.length > 0 ? data.topArticles.map((article, index) => (
          <div key={article.id} className="flex items-center gap-3 border-b border-ink/[0.06] px-5 py-4 last:border-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pink/[0.07] text-[10px] font-black text-pink">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/articles/${article.id}`} className="line-clamp-1 text-[12px] font-black text-ink hover:text-pink">
                {article.title}
              </Link>
              <p className="mt-1 truncate text-[9px] font-bold text-ink/30">/articles/{article.slug}</p>
            </div>
            <strong className="shrink-0 text-[12px] font-black text-ink/55">
              {article.views.toLocaleString("ja-JP")} views
            </strong>
          </div>
        )) : (
          <div className="px-5 py-14 text-center">
            <Eye size={26} className="mx-auto text-pink/30" />
            <p className="mt-3 text-[11px] font-black text-ink/40">この期間の閲覧データはまだありません</p>
          </div>
        )}
      </section>
    </div>
  );
}
