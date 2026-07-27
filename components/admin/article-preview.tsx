"use client";

import { CalendarDays, X } from "lucide-react";
import type { ArticleTag } from "@/lib/articles/types";

type ArticlePreviewProps = {
  title: string;
  excerpt: string;
  coverImageUrl: string;
  contentHtml: string;
  tags: ArticleTag[];
  publishedAt: string;
  onClose?: () => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "公開日未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function ArticlePreview({
  title,
  excerpt,
  coverImageUrl,
  contentHtml,
  tags,
  publishedAt,
  onClose,
}: ArticlePreviewProps) {
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
          <p className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold text-ink/35">
            <CalendarDays size={13} aria-hidden="true" />
            {formatDate(publishedAt)}
          </p>
        </div>

        {coverImageUrl && (
          <div className="mt-8 overflow-hidden rounded-[26px] border border-pink/10 bg-white shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt=""
              className="aspect-[3/1] w-full object-cover"
            />
          </div>
        )}

        <div
          className="article-prose mx-auto mt-10 max-w-[760px]"
          dangerouslySetInnerHTML={{ __html: contentHtml || "<p></p>" }}
        />
      </div>
    </article>
  );
}
