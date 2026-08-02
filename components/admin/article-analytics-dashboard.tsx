"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  Download,
  Eye,
  Home,
  ImageDown,
  Share2,
} from "lucide-react";
import type { ArticleAnalyticsData, ArticleAnalyticsPoint } from "@/lib/articles/types";

type MetricKey = "views" | "homeVisits" | "planCreations" | "planImageSaves" | "planShares";

const METRICS: Record<MetricKey, {
  label: string;
  shortLabel: string;
  barClass: string;
  selectedClass: string;
}> = {
  views: {
    label: "記事閲覧",
    shortLabel: "記事閲覧",
    barClass: "bg-pink/75 group-hover:bg-pink",
    selectedClass: "bg-pink ring-pink/25",
  },
  homeVisits: {
    label: "TOPページ訪問",
    shortLabel: "TOP訪問",
    barClass: "bg-[#75a7d8]/80 group-hover:bg-[#5687bd]",
    selectedClass: "bg-[#5687bd] ring-[#5687bd]/25",
  },
  planCreations: {
    label: "マイプラン作成",
    shortLabel: "プラン作成",
    barClass: "bg-[#70ae94]/80 group-hover:bg-[#4d987a]",
    selectedClass: "bg-[#4d987a] ring-[#4d987a]/25",
  },
  planImageSaves: {
    label: "マイプラン画像保存",
    shortLabel: "画像保存",
    barClass: "bg-[#d49a5d]/80 group-hover:bg-[#bd7f3f]",
    selectedClass: "bg-[#bd7f3f] ring-[#bd7f3f]/25",
  },
  planShares: {
    label: "マイプラン共有",
    shortLabel: "共有",
    barClass: "bg-[#9b7fbd]/80 group-hover:bg-[#8264a6]",
    selectedClass: "bg-[#8264a6] ring-[#8264a6]/25",
  },
};

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function formatLongDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function metricValue(point: ArticleAnalyticsPoint, metric: MetricKey) {
  return point[metric];
}

function average(total: number, days: number) {
  return Math.round((total / days) * 10) / 10;
}

export function ArticleAnalyticsDashboard({
  data,
  setupError = "",
}: {
  data: ArticleAnalyticsData;
  setupError?: string;
}) {
  const [metric, setMetric] = useState<MetricKey>("views");
  const [selectedDate, setSelectedDate] = useState("");
  const metricConfig = METRICS[metric];
  const selectedPoint = data.daily.find((point) => point.date === selectedDate);
  const maxValue = Math.max(...data.daily.map((point) => metricValue(point, metric)), 1);

  const downloadCsv = () => {
    const rows = [
      ["日付", "記事閲覧数", "TOPページ訪問数", "マイプラン作成数", "画像保存数", "共有数"],
      ...data.daily.map((point) => [
        point.date,
        String(point.views),
        String(point.homeVisits),
        String(point.planCreations),
        String(point.planImageSaves),
        String(point.planShares),
      ]),
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
    anchor.download = `site-analytics-${data.rangeDays}days.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summaries = [
    {
      label: `${data.rangeDays}日間の記事閲覧`,
      value: data.totalViews,
      today: data.todayViews,
      average: data.averageViews,
      icon: Eye,
      tone: "text-pink bg-pink/10",
    },
    {
      label: `${data.rangeDays}日間のTOP訪問`,
      value: data.homeVisits,
      today: data.todayHomeVisits,
      average: average(data.homeVisits, data.rangeDays),
      icon: Home,
      tone: "text-[#5687bd] bg-[#eef5fc]",
    },
    {
      label: `${data.rangeDays}日間のマイプラン作成`,
      value: data.planCreations,
      today: data.todayPlanCreations,
      average: average(data.planCreations, data.rangeDays),
      icon: ClipboardCheck,
      tone: "text-[#4d987a] bg-mint/10",
    },
    {
      label: `${data.rangeDays}日間の画像保存`,
      value: data.planImageSaves,
      today: data.todayPlanImageSaves,
      average: average(data.planImageSaves, data.rangeDays),
      icon: ImageDown,
      tone: "text-[#bd7f3f] bg-[#fff5e9]",
    },
    {
      label: `${data.rangeDays}日間の共有`,
      value: data.planShares,
      today: data.todayPlanShares,
      average: average(data.planShares, data.rangeDays),
      icon: Share2,
      tone: "text-[#8264a6] bg-[#f4effa]",
    },
  ];

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-pink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
            <BarChart3 size={15} aria-hidden="true" />
            ANALYTICS
          </p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">サイト分析</h1>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
            個人を識別する情報を保存せず、訪問・マイプラン利用・記事閲覧の傾向を確認します。
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summaries.map(({ label, value, today, average: dailyAverage, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <p className="mt-4 text-[10px] font-black text-ink/40">{label}</p>
            <strong className="mt-1 block font-display text-[30px] font-semibold text-ink">
              {value.toLocaleString("ja-JP")}
            </strong>
            <p className="mt-1 text-[9px] font-bold text-ink/35">
              今日 {today.toLocaleString("ja-JP")}件 ・ 1日平均 {dailyAverage.toLocaleString("ja-JP")}件
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[9px] font-bold leading-5 text-ink/35">
        TOP訪問は同じタブ内の同じ日に1回、マイプラン作成は最初の予定追加時に1回として集計します。
        画像保存は保存開始時、共有は端末の共有操作が完了した時に数えます。
      </p>

      <section className="mt-5 rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[14px] font-black text-ink">日別の推移</h2>
            <p className="mt-1 text-[9px] font-bold text-ink/35">日本時間の日付で集計</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap" aria-label="グラフの表示項目">
            {(Object.keys(METRICS) as MetricKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                aria-pressed={metric === key}
                className={`min-h-9 rounded-full px-3 text-[9px] font-black transition ${
                  metric === key
                    ? "bg-ink text-white"
                    : "border border-ink/10 bg-white text-ink/45 hover:border-pink/25 hover:text-pink"
                }`}
              >
                {METRICS[key].shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-ink/[0.035] px-4 py-2.5"
          aria-live="polite"
        >
          {selectedPoint ? (
            <>
              <span className="text-[10px] font-black text-ink/50">{formatLongDate(selectedPoint.date)}</span>
              <strong className="text-[12px] font-black text-ink">
                {metricConfig.label} {metricValue(selectedPoint, metric).toLocaleString("ja-JP")}件
              </strong>
            </>
          ) : (
            <span className="text-[10px] font-bold text-ink/40">棒をクリックまたはタップすると、その日の件数を表示します。</span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[9px] font-black text-ink/35">{metricConfig.label}</span>
          <span className="text-[9px] font-black text-ink/30">最大 {maxValue.toLocaleString("ja-JP")}件</span>
        </div>
        <div className="mt-3 overflow-x-auto pb-2">
          <div
            className="flex h-[220px] min-w-max items-end gap-1.5 border-b border-ink/10"
            style={{ width: Math.max(620, data.daily.length * 20) }}
          >
            {data.daily.map((point, index) => {
              const value = metricValue(point, metric);
              const selected = point.date === selectedDate;
              return (
                <div key={point.date} className="flex h-full min-w-[14px] flex-1 flex-col items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(point.date)}
                    aria-label={`${formatLongDate(point.date)}の${metricConfig.label}は${value}件`}
                    aria-pressed={selected}
                    title={`${point.date}: ${value}件`}
                    className="group flex h-[176px] w-full items-end rounded-t-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
                  >
                    <span
                      className={`block w-full min-w-[8px] rounded-t-md transition ${
                        selected ? `${metricConfig.selectedClass} ring-4` : metricConfig.barClass
                      }`}
                      style={{ height: value ? `${Math.max(6, (value / maxValue) * 100)}%` : "2px" }}
                    />
                  </button>
                  <span className="mt-2 h-4 text-[8px] font-bold text-ink/30">
                    {(data.daily.length <= 7 || index % Math.ceil(data.daily.length / 7) === 0)
                      ? formatShortDate(point.date)
                      : ""}
                  </span>
                </div>
              );
            })}
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
            <p className="mt-3 text-[11px] font-black text-ink/40">この期間の記事閲覧データはまだありません</p>
          </div>
        )}
      </section>
    </div>
  );
}
