"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookCopy,
  Check,
  Edit3,
  ExternalLink,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { ArticleSeries } from "@/lib/articles/types";

type SeriesManagerProps = {
  initialSeries: ArticleSeries[];
  setupError?: string;
};

function normalizeSlug(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function SeriesManager({
  initialSeries,
  setupError = "",
}: SeriesManagerProps) {
  const [series, setSeries] = useState(initialSeries);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const reset = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setEditingId("");
  };

  const save = async () => {
    if (!title.trim() || !normalizeSlug(slug)) {
      setMessage("シリーズ名とスラッグを入力してください。");
      return;
    }
    const id = editingId;
    setBusyId(id || "new");
    setMessage("");
    try {
      const response = await fetch(id ? `/api/admin/series/${id}` : "/api/admin/series", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: normalizeSlug(slug),
          description: description.trim(),
        }),
      });
      const data = await response.json() as { series?: ArticleSeries; error?: string };
      if (!response.ok || !data.series) {
        throw new Error(data.error || "シリーズの保存に失敗しました。");
      }
      if (id) {
        setSeries((items) => items.map((item) => item.id === id
          ? { ...data.series!, articleCount: item.articleCount }
          : item));
      } else {
        setSeries((items) => [...items, { ...data.series!, articleCount: 0 }]
          .sort((a, b) => a.title.localeCompare(b.title, "ja")));
      }
      reset();
      setMessage(id ? "シリーズを更新しました。" : "シリーズを追加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "シリーズの保存に失敗しました。");
    } finally {
      setBusyId("");
    }
  };

  const beginEdit = (item: ArticleSeries) => {
    setEditingId(item.id);
    setTitle(item.title);
    setSlug(item.slug);
    setDescription(item.description);
    setMessage("");
  };

  const remove = async (item: ArticleSeries) => {
    if (!window.confirm(`シリーズ「${item.title}」を削除しますか？記事は削除されず、シリーズ設定だけが外れます。`)) return;
    setBusyId(item.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/series/${item.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "シリーズの削除に失敗しました。");
      setSeries((items) => items.filter((value) => value.id !== item.id));
      if (editingId === item.id) reset();
      setMessage("シリーズを削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "シリーズの削除に失敗しました。");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-[980px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="border-b border-pink/10 pb-6">
        <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
          <BookCopy size={15} aria-hidden="true" />
          CONTENT
        </p>
        <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">記事シリーズ</h1>
        <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
          関連する記事を連載としてまとめ、読む順番を案内できます。
        </p>
      </div>

      {setupError && (
        <p className="mt-5 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold leading-5 text-[#76582f]">
          {setupError}
        </p>
      )}

      <section className="mt-5 rounded-2xl border border-ink/[0.07] bg-white p-4 shadow-soft sm:p-5">
        <h2 className="text-[12px] font-black text-ink">{editingId ? "シリーズを編集" : "新しいシリーズ"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!editingId) setSlug(normalizeSlug(event.target.value));
            }}
            maxLength={100}
            placeholder="シリーズ名"
            aria-label="シリーズ名"
            className="min-h-11 rounded-xl border border-ink/10 px-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
          />
          <input
            value={slug}
            onChange={(event) => setSlug(normalizeSlug(event.target.value))}
            maxLength={80}
            placeholder="series-slug"
            aria-label="シリーズスラッグ"
            className="min-h-11 rounded-xl border border-ink/10 px-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
          />
        </div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={300}
          rows={3}
          placeholder="シリーズの説明"
          aria-label="シリーズの説明"
          className="mt-3 w-full resize-y rounded-xl border border-ink/10 px-3 py-3 text-[11px] font-bold leading-5 text-ink outline-none focus:border-pink"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[9px] font-bold text-ink/30">{description.length} / 300</span>
          <div className="flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={reset}
                aria-label="編集をキャンセル"
                className="grid h-11 w-11 place-items-center rounded-xl border border-ink/10 text-ink/40"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="button"
              disabled={Boolean(setupError) || Boolean(busyId)}
              onClick={() => void save()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[10px] font-black text-white disabled:opacity-40"
            >
              {busyId === (editingId || "new")
                ? <LoaderCircle size={14} className="animate-spin" />
                : editingId ? <Check size={14} /> : <Plus size={14} />}
              {editingId ? "更新" : "追加"}
            </button>
          </div>
        </div>
        {message && <p role="status" className="mt-3 text-[10px] font-bold text-pink">{message}</p>}
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-soft">
        {series.length > 0 ? series.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 border-b border-ink/[0.06] px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-[12px] font-black text-ink">{item.title}</strong>
                <span className="rounded-full bg-pink/[0.07] px-2 py-1 text-[8px] font-black text-pink">
                  {item.articleCount || 0}記事
                </span>
              </div>
              <p className="mt-1 text-[9px] font-bold text-ink/30">/articles/series/{item.slug}</p>
              {item.description && (
                <p className="mt-2 line-clamp-2 text-[10px] font-bold leading-5 text-ink/45">{item.description}</p>
              )}
            </div>
            <div className="flex justify-end gap-1">
              <Link
                href={`/articles/series/${item.slug}`}
                target="_blank"
                aria-label={`${item.title}の公開ページ`}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/35 hover:bg-pink/[0.05] hover:text-pink"
              >
                <ExternalLink size={14} />
              </Link>
              <button
                type="button"
                onClick={() => beginEdit(item)}
                aria-label={`${item.title}を編集`}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/35 hover:bg-pink/[0.05] hover:text-pink"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => void remove(item)}
                aria-label={`${item.title}を削除`}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/30 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                {busyId === item.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        )) : (
          <div className="px-5 py-14 text-center">
            <BookCopy size={26} className="mx-auto text-pink/35" />
            <p className="mt-3 text-[11px] font-black text-ink/40">シリーズはまだありません</p>
          </div>
        )}
      </section>
    </div>
  );
}
