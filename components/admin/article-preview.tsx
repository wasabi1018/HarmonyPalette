"use client";

import { CalendarDays, Clock3, List, RefreshCw, UserRound, X } from "lucide-react";
import { ArticleShareActions } from "@/components/article-share-actions";
import { formatArticlePublishedDate } from "@/lib/articles/content-presentation";
import type { ArticleHeading } from "@/lib/articles/publishing";
import type { ArticleTag } from "@/lib/articles/types";
import type { ReactNode } from "react";

type ArticlePreviewProps = {
  title: string;
  excerpt: string;
  coverImageUrl: string;
  contentHtml: string;
  tags: ArticleTag[];
  publishedAt: string;
  updatedAt?: string;
  headings?: ArticleHeading[];
  readingTimeMinutes?: number;
  articleUrl?: string;
  authorName?: string;
  authorHref?: string;
  authorDescription?: string;
  datedContentNotice?: string;
  onClose?: () => void;
  topContent?: ReactNode;
  bodyContent?: ReactNode;
  endContent?: ReactNode;
};

function dateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function ArticlePreview({
  title,
  excerpt,
  coverImageUrl,
  contentHtml,
  tags,
  publishedAt,
  updatedAt,
  headings = [],
  readingTimeMinutes,
  articleUrl,
  authorName,
  authorHref,
  authorDescription,
  datedContentNotice,
  onClose,
  topContent,
  bodyContent,
  endContent,
}: ArticlePreviewProps) {
  const showUpdatedAt = Boolean(
    updatedAt
    && dateKey(updatedAt) !== dateKey(publishedAt),
  );

  return (
    <article className="min-h-full bg-[#fffafd]">
      {onClose && (
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-pink/10 bg-white/95 px-4 backdrop-blur-xl sm:px-6">
          <div>
            <p className="text-[9px] font-black tracking-[0.18em] text-pink">ARTICLE PREVIEW</p>
            <p className="mt-0.5 text-[12px] font-black text-ink">公開時の見え方</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="プレビューを閉じる"
            className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 text-ink/55 transition hover:border-pink/30 hover:text-pink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
      )}

      <div className="mx-auto w-full max-w-[920px] px-4 py-10 sm:px-7 sm:py-14">
        <div className="mx-auto max-w-[760px] text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-3 py-1 text-[10px] font-black"
                style={{ color: tag.color, backgroundColor: `${tag.color}14` }}
              >
                {tag.name}
              </span>
            ))}
          </div>
          <h1 className="mt-5 font-display text-[30px] font-semibold leading-[1.45] text-ink sm:text-[42px]">
            {title || "無題の記事"}
          </h1>
          {excerpt && (
            <p className="mx-auto mt-4 max-w-[680px] text-[13px] font-bold leading-7 text-ink/55">
              {excerpt}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-bold text-ink/35">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={13} aria-hidden="true" />
              公開 {formatArticlePublishedDate(publishedAt) || "公開日未設定"}
            </span>
            {showUpdatedAt && updatedAt && (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={13} aria-hidden="true" />
                更新 {formatArticlePublishedDate(updatedAt) || "更新日未設定"}
              </span>
            )}
            {authorName && (
              <a
                href={authorHref || "/about"}
                className="inline-flex items-center gap-2 transition hover:text-pink"
              >
                <UserRound size={13} aria-hidden="true" />
                取材・執筆 {authorName}
              </a>
            )}
            {readingTimeMinutes && (
              <span className="inline-flex items-center gap-2">
                <Clock3 size={13} aria-hidden="true" />
                約{readingTimeMinutes}分で読めます
              </span>
            )}
          </div>
        </div>

        {coverImageUrl && (
          <div className="mt-8 overflow-hidden rounded-[26px] border border-pink/10 bg-white shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt={`${title || "記事"}のアイキャッチ画像`}
              className="aspect-[3/1] w-full object-cover"
            />
          </div>
        )}

        <div className="mx-auto max-w-[760px]">
          {topContent && <div className="article-print-hidden mt-6">{topContent}</div>}
          {datedContentNotice && (
            <aside className="mt-8 rounded-2xl border border-[#e9cf9d] bg-[#fffaf0] px-4 py-3 text-[11px] font-bold leading-6 text-ink/65">
              {datedContentNotice}
            </aside>
          )}
          {headings.length >= 2 && (
            <nav
              aria-label="この記事の目次"
              className="article-print-hidden mt-9 rounded-2xl border border-pink/10 bg-white p-5 shadow-soft sm:p-6"
            >
              <p className="flex items-center gap-2 text-[11px] font-black text-ink">
                <List size={16} className="text-pink" aria-hidden="true" />
                この記事の目次
              </p>
              <ol className="mt-4 space-y-2.5">
                {headings.map((heading) => (
                  <li key={heading.id} className={heading.level > 2 ? "pl-4" : ""}>
                    <a
                      href={`#${heading.id}`}
                      className="text-[11px] font-bold leading-5 text-ink/55 transition hover:text-pink"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {bodyContent ? <div className="mt-10 scroll-mt-24">{bodyContent}</div> : <div
            className="article-prose mt-10 scroll-mt-24"
            dangerouslySetInnerHTML={{ __html: contentHtml || "<p></p>" }}
          />}
          {endContent && <div className="article-print-hidden mt-10">{endContent}</div>}
          {authorName && (
            <aside className="article-print-hidden mt-10 rounded-2xl border border-pink/15 bg-white p-5 shadow-soft sm:p-6" aria-label="この記事の著者">
              <p className="text-[9px] font-black tracking-[0.16em] text-pink">AUTHOR</p>
              <div className="mt-3 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink/[0.08] text-pink">
                  <UserRound size={18} aria-hidden="true" />
                </span>
                <div>
                  <a href={authorHref || "/about"} className="text-[13px] font-black text-ink hover:text-pink hover:underline">
                    {authorName}
                  </a>
                  {authorDescription && (
                    <p className="mt-1.5 text-[11px] font-bold leading-6 text-ink/50">
                      {authorDescription}
                    </p>
                  )}
                </div>
              </div>
            </aside>
          )}
          {articleUrl && (
            <ArticleShareActions title={title} canonicalUrl={articleUrl} />
          )}
        </div>
      </div>
    </article>
  );
}
