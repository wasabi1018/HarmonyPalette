"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArchiveRestore,
  FileText,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import type { ArticleSummary } from "@/lib/articles/types";

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ArticleTrashManager({
  initialArticles,
  setupError = "",
}: {
  initialArticles: ArticleSummary[];
  setupError?: string;
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const restore = async (article: ArticleSummary) => {
    setBusyId(article.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/restore`, { method: "POST" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "記事を復元できませんでした。");
      setArticles((items) => items.filter((item) => item.id !== article.id));
      setMessage(`「${article.title}」を下書きへ復元しました。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "記事を復元できませんでした。");
    } finally {
      setBusyId("");
    }
  };

  const removePermanently = async (article: ArticleSummary) => {
    if (!window.confirm(`「${article.title}」を完全に削除しますか？この操作は元に戻せません。`)) return;
    setBusyId(article.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/permanent`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "記事を完全削除できませんでした。");
      setArticles((items) => items.filter((item) => item.id !== article.id));
      setMessage("記事を完全に削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "記事を完全削除できませんでした。");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="border-b border-pink/10 pb-6">
        <Link href="/admin/articles" className="inline-flex items-center gap-2 text-[10px] font-black text-pink hover:underline">
          <ArrowLeft size={14} aria-hidden="true" />
          記事管理へ戻る
        </Link>
        <p className="mt-5 flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
          <Trash2 size={15} aria-hidden="true" />
          TRASH
        </p>
        <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">記事のゴミ箱</h1>
        <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
          削除した記事を下書きへ復元するか、完全に削除できます。
        </p>
      </div>

      {setupError && (
        <p className="mt-5 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold text-[#76582f]">
          {setupError}
        </p>
      )}
      {message && <p role="status" className="mt-4 text-[10px] font-bold text-pink">{message}</p>}

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-soft">
        {articles.length > 0 ? articles.map((article) => (
          <article
            key={article.id}
            className="flex flex-col gap-4 border-b border-ink/[0.06] p-4 last:border-0 sm:flex-row sm:items-center sm:px-5"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-pink/[0.05]">
                {article.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-pink/35"><FileText size={20} /></span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="line-clamp-1 text-[13px] font-black text-ink">{article.title}</h2>
                <p className="mt-1 line-clamp-1 text-[9px] font-bold text-ink/35">/articles/{article.slug}</p>
                <p className="mt-2 text-[9px] font-bold text-ink/35">
                  ゴミ箱へ移動: {formatDate(article.deletedAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => void restore(article)}
                disabled={Boolean(busyId)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink/20 bg-white px-4 text-[10px] font-black text-pink hover:bg-pink/[0.04] disabled:opacity-40"
              >
                {busyId === article.id ? <LoaderCircle size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                復元
              </button>
              <button
                type="button"
                onClick={() => void removePermanently(article)}
                disabled={Boolean(busyId)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-100 bg-white px-4 text-[10px] font-black text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={14} />
                完全削除
              </button>
            </div>
          </article>
        )) : (
          <div className="px-5 py-16 text-center">
            <Trash2 size={28} className="mx-auto text-pink/30" />
            <p className="mt-3 text-[12px] font-black text-ink/45">ゴミ箱は空です</p>
          </div>
        )}
      </div>
    </div>
  );
}
