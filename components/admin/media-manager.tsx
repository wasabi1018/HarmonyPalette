"use client";

import { useMemo, useRef, useState } from "react";
import {
  ImageIcon,
  LoaderCircle,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { ArticleMedia } from "@/lib/articles/types";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaManager({
  initialMedia,
  setupError = "",
}: {
  initialMedia: ArticleMedia[];
  setupError?: string;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [query, setQuery] = useState("");
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>(() => (
    Object.fromEntries(initialMedia.map((item) => [item.id, item.altText]))
  ));
  const [busyId, setBusyId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ja");
    if (!normalized) return media;
    return media.filter((item) => (
      `${item.fileName} ${item.altText}`.toLocaleLowerCase("ja").includes(normalized)
    ));
  }, [media, query]);

  const upload = async (file: File) => {
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/article-images", { method: "POST", body: formData });
      const data = await response.json() as { media?: ArticleMedia; error?: string };
      if (!response.ok || !data.media) throw new Error(data.error || "画像をアップロードできませんでした。");
      setMedia((items) => [data.media as ArticleMedia, ...items]);
      setAltDrafts((drafts) => ({ ...drafts, [data.media!.id]: data.media!.altText }));
      setMessage("画像をアップロードしました。代替テキストも設定してください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像をアップロードできませんでした。");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveAlt = async (item: ArticleMedia) => {
    setBusyId(item.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText: altDrafts[item.id] || "" }),
      });
      const data = await response.json() as { media?: ArticleMedia; error?: string };
      if (!response.ok || !data.media) throw new Error(data.error || "代替テキストを保存できませんでした。");
      setMedia((items) => items.map((current) => current.id === item.id ? data.media as ArticleMedia : current));
      setMessage("代替テキストを保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "代替テキストを保存できませんでした。");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (item: ArticleMedia) => {
    if (!window.confirm(`「${item.fileName}」を削除しますか？`)) return;
    setBusyId(item.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "画像を削除できませんでした。");
      setMedia((items) => items.filter((current) => current.id !== item.id));
      setMessage("画像を削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像を削除できませんでした。");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-pink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
            <ImageIcon size={15} aria-hidden="true" />
            MEDIA
          </p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">メディア</h1>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
            記事で使う画像をアップロードし、代替テキストと使用状況を管理します。
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || Boolean(setupError)}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-pink px-5 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(235,110,152,0.22)] disabled:opacity-40"
        >
          {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
          画像を追加
        </button>
      </div>

      {setupError && (
        <p className="mt-5 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold text-[#76582f]">
          {setupError}
        </p>
      )}
      {message && <p role="status" className="mt-4 text-[10px] font-bold text-pink">{message}</p>}

      <label className="relative mt-5 block max-w-[460px]">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ファイル名・代替テキストを検索"
          className="min-h-11 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
        />
      </label>

      {filtered.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.publicUrl} alt="" loading="lazy" className="aspect-[16/10] w-full bg-pink/[0.04] object-cover" />
              <div className="p-4">
                <h2 className="truncate text-[11px] font-black text-ink" title={item.fileName}>{item.fileName}</h2>
                <p className="mt-1 text-[9px] font-bold text-ink/35">
                  {item.width && item.height ? `${item.width} × ${item.height} / ` : ""}{formatBytes(item.sizeBytes)}
                </p>
                <label className="mt-4 block">
                  <span className="text-[9px] font-black text-ink/45">代替テキスト</span>
                  <textarea
                    value={altDrafts[item.id] || ""}
                    maxLength={300}
                    rows={3}
                    onChange={(event) => setAltDrafts((drafts) => ({ ...drafts, [item.id]: event.target.value }))}
                    placeholder="画像の内容を簡潔に説明"
                    className="mt-2 w-full resize-y rounded-xl border border-ink/10 px-3 py-2.5 text-[10px] font-bold leading-5 text-ink outline-none focus:border-pink"
                  />
                </label>
                <div className="mt-3 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    disabled={Boolean(busyId)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[9px] font-black text-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                    削除
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveAlt(item)}
                    disabled={Boolean(busyId) || (altDrafts[item.id] || "") === item.altText}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-pink px-3 text-[9px] font-black text-white disabled:opacity-40"
                  >
                    {busyId === item.id ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}
                    保存
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-ink/[0.07] bg-white px-5 py-16 text-center shadow-soft">
          <ImageIcon size={28} className="mx-auto text-pink/30" />
          <p className="mt-3 text-[12px] font-black text-ink/45">
            {media.length === 0 ? "画像はまだありません" : "条件に一致する画像がありません"}
          </p>
        </div>
      )}
    </div>
  );
}
