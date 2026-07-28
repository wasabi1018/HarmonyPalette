"use client";

import { AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import type {
  ArticleQualityReport,
  ArticleQualityTarget,
} from "@/lib/articles/quality";

type ArticleQualityPanelProps = {
  report: ArticleQualityReport;
  checkingLinks: boolean;
  onCheckLinks: () => void;
  onSelectTarget: (target: ArticleQualityTarget) => void;
};

export function ArticleQualityPanel({
  report,
  checkingLinks,
  onCheckLinks,
  onSelectTarget,
}: ArticleQualityPanelProps) {
  const scoreTone = report.errorCount
    ? "text-red-600"
    : report.warningCount
      ? "text-[#a56b20]"
      : "text-[#35745f]";

  return (
    <section className="rounded-2xl border border-pink/10 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black text-ink">
            <ShieldCheck size={16} className="text-pink" aria-hidden="true" />
            公開前チェック
          </p>
          <p className="mt-1 text-[9px] font-bold leading-4 text-ink/35">
            入力内容をリアルタイムで確認します。
          </p>
        </div>
        <div className={`text-right ${scoreTone}`}>
          <strong className="font-display text-[22px] leading-none">{report.score}</strong>
          <span className="ml-0.5 text-[8px] font-black">/100</span>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
        <span
          className={`block h-full rounded-full transition-all ${
            report.errorCount ? "bg-red-400" : report.warningCount ? "bg-[#e7ad52]" : "bg-[#55bd8d]"
          }`}
          style={{ width: `${report.score}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-black">
        <span className="rounded-full bg-red-50 px-2 py-1 text-red-600">エラー {report.errorCount}</span>
        <span className="rounded-full bg-[#fff7e9] px-2 py-1 text-[#a56b20]">警告 {report.warningCount}</span>
        <span className="rounded-full bg-[#eefaf4] px-2 py-1 text-[#35745f]">完了 {report.passCount}</span>
      </div>

      <details className="group mt-3 border-t border-ink/[0.06] pt-3" open={report.errorCount > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[9px] font-black text-ink/50">
          チェック結果を確認
          <ChevronDown size={13} className="transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2">
          {report.checks.map((check) => {
            const Icon = check.status === "pass"
              ? CheckCircle2
              : check.status === "error"
                ? AlertCircle
                : TriangleAlert;
            const tone = check.status === "pass"
              ? "text-[#35745f]"
              : check.status === "error"
                ? "text-red-600"
                : "text-[#a56b20]";
            return (
              <button
                type="button"
                key={check.id}
                onClick={() => onSelectTarget(check.target)}
                className="flex w-full items-start gap-2 rounded-xl border border-ink/[0.06] px-2.5 py-2 text-left transition hover:border-pink/20 hover:bg-pink/[0.02]"
              >
                <Icon size={13} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
                <span className="min-w-0">
                  <strong className={`block text-[9px] font-black ${tone}`}>{check.label}</strong>
                  <span className="mt-0.5 block text-[8px] font-bold leading-4 text-ink/35">{check.message}</span>
                </span>
              </button>
            );
          })}
        </div>
      </details>

      {report.internalLinks.length > 0 && (
        <button
          type="button"
          onClick={onCheckLinks}
          disabled={checkingLinks}
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-pink/15 bg-pink/[0.04] text-[9px] font-black text-pink transition hover:bg-pink/[0.08] disabled:opacity-50"
        >
          {checkingLinks && <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />}
          内部リンク{report.internalLinks.length}件を確認
        </button>
      )}
    </section>
  );
}
