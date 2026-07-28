"use client";

import { Archive, Download, FileJson, FileSpreadsheet, HardDrive } from "lucide-react";
import type { ArticleBackupSummary } from "@/lib/articles/backup";

type ArticleBackupPanelProps = {
  summary: ArticleBackupSummary;
  setupError?: string;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

export function ArticleBackupPanel({
  summary,
  setupError = "",
}: ArticleBackupPanelProps) {
  const cards = [
    ["記事", summary.articles],
    ["タグ", summary.tags],
    ["シリーズ", summary.series],
    ["変更履歴", summary.revisions],
  ] as const;

  return (
    <div className="mx-auto max-w-[980px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="border-b border-pink/10 pb-6">
        <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
          <Archive size={15} aria-hidden="true" />
          DATA SAFETY
        </p>
        <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">
          記事バックアップ
        </h1>
        <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
          記事データを手元へ保存し、運用記録や移行準備に利用できます。
        </p>
      </div>

      {setupError && (
        <p className="mt-5 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold leading-5 text-[#76582f]">
          {setupError}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-pink/10 bg-white p-4 shadow-soft">
            <p className="text-[9px] font-black text-ink/35">{label}</p>
            <p className="mt-2 font-display text-[27px] font-semibold text-ink">{value.toLocaleString("ja-JP")}</p>
          </div>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-pink/10 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink/[0.08] text-pink">
            <FileJson size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[13px] font-black text-ink">完全バックアップ（JSON）</h2>
            <p className="mt-1 text-[10px] font-bold leading-5 text-ink/45">
              本文、下書き、削除済み記事、タグ、シリーズ、変更履歴、メディア情報、集計アクセス数を保存します。
            </p>
          </div>
        </div>
        <a
          href="/api/admin/article-backup?format=json"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(235,110,152,0.2)]"
        >
          <Download size={15} aria-hidden="true" />
          JSONをダウンロード
        </a>
      </section>

      <section className="mt-4 rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef8f4] text-[#4b9b7e]">
            <FileSpreadsheet size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[13px] font-black text-ink">記事台帳（CSV）</h2>
            <p className="mt-1 text-[10px] font-bold leading-5 text-ink/45">
              記事名、公開状態、シリーズ、タグ、更新日などを表計算ソフトで確認できます。
            </p>
          </div>
        </div>
        <a
          href="/api/admin/article-backup?format=csv"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#bfe4d2] bg-[#f0fbf5] px-5 text-[10px] font-black text-[#35745f]"
        >
          <Download size={15} aria-hidden="true" />
          CSVをダウンロード
        </a>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#efd59a] bg-[#fff9ea] px-4 py-4 text-[#76582f]">
        <HardDrive size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[9px] font-bold leading-5">
          メディアは{summary.media.toLocaleString("ja-JP")}件（{formatBytes(summary.mediaBytes)}）登録されています。
          バックアップにはファイル情報とURLが含まれますが、画像ファイル本体は含まれません。
        </p>
      </div>
    </div>
  );
}
