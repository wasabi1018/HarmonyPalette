"use client";

import { useState } from "react";
import { Check, Link2, Printer, Share2 } from "lucide-react";

type ArticleShareActionsProps = {
  title: string;
  canonicalUrl: string;
};

function currentArticleUrl(fallback: string) {
  return typeof window === "undefined" ? fallback : window.location.href;
}

export function ArticleShareActions({
  title,
  canonicalUrl,
}: ArticleShareActionsProps) {
  const [notice, setNotice] = useState("");

  async function copyLink() {
    const url = currentArticleUrl(canonicalUrl);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("リンクをコピーしました");
    } catch {
      setNotice("リンクをコピーできませんでした");
    }
  }

  async function share() {
    const url = currentArticleUrl(canonicalUrl);
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, url });
      setNotice("共有しました");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("共有できませんでした");
    }
  }

  const buttonClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-pink/15 bg-white px-3.5 text-[10px] font-black text-ink/55 transition hover:border-pink/30 hover:text-pink";

  return (
    <div className="article-print-hidden mt-9 border-t border-pink/10 pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void share()} className={buttonClass}>
          <Share2 size={14} aria-hidden="true" />
          共有
        </button>
        <button type="button" onClick={() => void copyLink()} className={buttonClass}>
          {notice === "リンクをコピーしました"
            ? <Check size={14} aria-hidden="true" />
            : <Link2 size={14} aria-hidden="true" />}
          リンクをコピー
        </button>
        <button type="button" onClick={() => window.print()} className={buttonClass}>
          <Printer size={14} aria-hidden="true" />
          印刷
        </button>
        <p aria-live="polite" className="min-h-5 text-[10px] font-bold text-pink">
          {notice}
        </p>
      </div>
    </div>
  );
}
