"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Copy,
  Edit3,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { ArticleSummary, ArticleTag } from "@/lib/articles/types";

type ArticleListManagerProps = {
  initialArticles: ArticleSummary[];
  availableTags: ArticleTag[];
  setupError?: string;
};

function formatDate(value: string | null) {
  if (!value) return "未公開";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未公開";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const statusLabel = {
  draft: "下書き",
  scheduled: "予約公開",
  published: "公開中",
} as const;

const statusClass = {
  draft: "bg-[#fff7e6] text-[#926e27]",
  scheduled: "bg-[#eef4ff] text-[#536fa8]",
  published: "bg-[#eef9f4] text-[#35745f]",
} as const;

const statusDot = {
  draft: "bg-[#f0b64b]",
  scheduled: "bg-[#7291c9]",
  published: "bg-[#57b78e]",
} as const;

const destinationLabel = {
  articles: "記事",
  guide: "初めての方へ",
} as const;

const destinationClass = {
  articles: "bg-pink/[0.08] text-pink",
  guide: "bg-[#fff5d9] text-[#9a6c19]",
} as const;

export function ArticleListManager({
  initialArticles,
  availableTags,
  setupError = "",
}: ArticleListManagerProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [destination, setDestination] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [deletingId, setDeletingId] = useState("");
  const [duplicatingId, setDuplicatingId] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja");
    return articles.filter((article) => {
      if (status !== "all" && article.status !== status) return false;
      if (destination !== "all" && article.destination !== destination) return false;
      if (tagId !== "all" && !article.tags.some((tag) => tag.id === tagId)) return false;
      if (!normalizedQuery) return true;
      return `${article.title} ${article.slug} ${article.excerpt}`
        .toLocaleLowerCase("ja")
        .includes(normalizedQuery);
    });
  }, [articles, destination, query, status, tagId]);

  const remove = async (article: ArticleSummary) => {
    if (!window.confirm(`「${article.title}」をゴミ箱へ移動しますか？後から復元できます。`)) return;
    setDeletingId(article.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "記事をゴミ箱へ移動できませんでした。");
      setArticles((items) => items.filter((item) => item.id !== article.id));
      setMessage("記事をゴミ箱へ移動しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "記事をゴミ箱へ移動できませんでした。");
    } finally {
      setDeletingId("");
    }
  };

  const duplicate = async (article: ArticleSummary) => {
    setDuplicatingId(article.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/duplicate`, { method: "POST" });
      const data = await response.json() as { article?: ArticleSummary; error?: string };
      if (!response.ok || !data.article) throw new Error(data.error || "記事の複製に失敗しました。");
      setArticles((items) => [data.article as ArticleSummary, ...items]);
      setMessage("記事を下書きとして複製しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "記事の複製に失敗しました。");
    } finally {
      setDuplicatingId("");
    }
  };

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-pink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
            <FileText size={15} aria-hidden="true" />
            CONTENT
          </p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">記事管理</h1>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
            下書き、公開記事、タグをまとめて確認できます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/articles/trash"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-[11px] font-black text-ink/50 transition hover:border-pink/25 hover:text-pink"
          >
            <Trash2 size={15} aria-hidden="true" />
            ゴミ箱
          </Link>
          <Link
            href="/admin/articles/new"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-pink px-5 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(235,110,152,0.22)] transition hover:bg-[#df5c89]"
          >
            <Plus size={16} aria-hidden="true" />
            新しい記事
          </Link>
        </div>
      </div>

      {setupError && (
        <p className="mt-5 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold leading-5 text-[#76582f]">
          {setupError}
        </p>
      )}

      <div className="mt-5 grid gap-3 rounded-2xl border border-ink/[0.07] bg-white p-3 shadow-soft md:grid-cols-[minmax(220px,1fr)_155px_155px_180px]">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="タイトル・スラッグを検索"
            className="min-h-11 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
          />
        </label>
        <label className="relative block">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="公開状態で絞り込み"
            className="min-h-11 w-full appearance-none rounded-xl border border-ink/10 bg-white pl-9 pr-3 text-[11px] font-black text-ink/60 outline-none focus:border-pink"
          >
            <option value="all">すべての状態</option>
            <option value="draft">下書き</option>
            <option value="scheduled">予約公開</option>
            <option value="published">公開中</option>
          </select>
        </label>
        <select
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          aria-label="表示先で絞り込み"
          className="min-h-11 rounded-xl border border-ink/10 bg-white px-3 text-[11px] font-black text-ink/60 outline-none focus:border-pink"
        >
          <option value="all">すべての表示先</option>
          <option value="articles">記事</option>
          <option value="guide">初めての方へ</option>
        </select>
        <select
          value={tagId}
          onChange={(event) => setTagId(event.target.value)}
          aria-label="タグで絞り込み"
          className="min-h-11 rounded-xl border border-ink/10 bg-white px-3 text-[11px] font-black text-ink/60 outline-none focus:border-pink"
        >
          <option value="all">すべてのタグ</option>
          {availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
      </div>

      {message && (
        <p role="status" className="mt-3 text-[10px] font-bold text-pink">{message}</p>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-soft">
        <div className="hidden grid-cols-[minmax(260px,1fr)_110px_150px_130px] gap-4 border-b border-ink/[0.07] bg-[#fffafd] px-5 py-3 text-[9px] font-black tracking-[0.1em] text-ink/35 md:grid">
          <span>記事</span>
          <span>ステータス</span>
          <span>公開日時</span>
          <span className="text-right">操作</span>
        </div>
        {filtered.length > 0 ? filtered.map((article) => (
          <article
            key={article.id}
            className="grid gap-4 border-b border-ink/[0.06] p-4 last:border-0 md:grid-cols-[minmax(260px,1fr)_110px_150px_130px] md:items-center md:px-5"
          >
            <div className="flex min-w-0 gap-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-pink/[0.05]">
                {article.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-pink/35"><FileText size={20} /></span>
                )}
              </div>
              <div className="min-w-0">
                <Link href={`/admin/articles/${article.id}`} className="line-clamp-1 text-[13px] font-black text-ink hover:text-pink">
                  {article.title}
                </Link>
                <p className="mt-1 line-clamp-1 text-[9px] font-bold text-ink/35">/articles/{article.slug}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${destinationClass[article.destination]}`}>
                    {destinationLabel[article.destination]}
                  </span>
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full px-2 py-0.5 text-[8px] font-black"
                      style={{ color: tag.color, backgroundColor: `${tag.color}14` }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ${statusClass[article.status]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot[article.status]}`} />
                {statusLabel[article.status]}
              </span>
            </div>
            <p className="inline-flex items-center gap-2 text-[9px] font-bold text-ink/40">
              <CalendarDays size={13} aria-hidden="true" />
              {formatDate(article.publishedAt)}
            </p>
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => void duplicate(article)}
                disabled={duplicatingId === article.id}
                aria-label={`${article.title}を複製`}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/40 transition hover:bg-pink/[0.06] hover:text-pink disabled:opacity-40"
              >
                {duplicatingId === article.id
                  ? <LoaderCircle size={15} className="animate-spin" />
                  : <Copy size={15} aria-hidden="true" />}
              </button>
              <Link
                href={`/admin/articles/${article.id}`}
                aria-label={`${article.title}を編集`}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/40 transition hover:bg-pink/[0.06] hover:text-pink"
              >
                <Edit3 size={15} aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => void remove(article)}
                disabled={deletingId === article.id}
                aria-label={`${article.title}を削除`}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/30 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                {deletingId === article.id
                  ? <LoaderCircle size={15} className="animate-spin" />
                  : <Trash2 size={15} />}
              </button>
            </div>
          </article>
        )) : (
          <div className="px-5 py-16 text-center">
            <FileText size={28} className="mx-auto text-pink/35" />
            <p className="mt-3 text-[12px] font-black text-ink/45">
              {articles.length === 0 ? "記事はまだありません" : "条件に一致する記事がありません"}
            </p>
            {articles.length === 0 && (
              <Link href="/admin/articles/new" className="mt-3 inline-flex text-[10px] font-black text-pink hover:underline">
                最初の記事を作成する
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
