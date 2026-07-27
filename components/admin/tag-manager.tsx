"use client";

import { useState } from "react";
import {
  Check,
  Edit3,
  LoaderCircle,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { ArticleTag } from "@/lib/articles/types";

type TagManagerProps = {
  initialTags: ArticleTag[];
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

export function TagManager({ initialTags, setupError = "" }: TagManagerProps) {
  const [tags, setTags] = useState(initialTags);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#eb6e98");
  const [editingId, setEditingId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const save = async (id = "") => {
    if (!name.trim() || !normalizeSlug(slug)) {
      setMessage("タグ名とスラッグを入力してください。");
      return;
    }
    setBusyId(id || "new");
    setMessage("");
    try {
      const response = await fetch(id ? `/api/admin/tags/${id}` : "/api/admin/tags", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: normalizeSlug(slug), color }),
      });
      const data = await response.json() as { tag?: ArticleTag; error?: string };
      if (!response.ok || !data.tag) throw new Error(data.error || "タグの保存に失敗しました。");
      if (id) {
        setTags((items) => items.map((tag) => tag.id === id
          ? { ...data.tag!, articleCount: tag.articleCount }
          : tag));
      } else {
        setTags((items) => [...items, { ...data.tag!, articleCount: 0 }].sort((a, b) => a.name.localeCompare(b.name, "ja")));
      }
      setName("");
      setSlug("");
      setColor("#eb6e98");
      setEditingId("");
      setMessage(id ? "タグを更新しました。" : "タグを追加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "タグの保存に失敗しました。");
    } finally {
      setBusyId("");
    }
  };

  const beginEdit = (tag: ArticleTag) => {
    setEditingId(tag.id);
    setName(tag.name);
    setSlug(tag.slug);
    setColor(tag.color);
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId("");
    setName("");
    setSlug("");
    setColor("#eb6e98");
  };

  const remove = async (tag: ArticleTag) => {
    if (!window.confirm(`タグ「${tag.name}」を削除しますか？記事自体は削除されません。`)) return;
    setBusyId(tag.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "タグの削除に失敗しました。");
      setTags((items) => items.filter((item) => item.id !== tag.id));
      if (editingId === tag.id) cancelEdit();
      setMessage("タグを削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "タグの削除に失敗しました。");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-[940px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="border-b border-pink/10 pb-6">
        <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
          <Tag size={15} aria-hidden="true" />
          CONTENT
        </p>
        <h1 className="mt-2 font-display text-[30px] font-semibold text-ink sm:text-[36px]">タグ管理</h1>
        <p className="mt-2 text-[12px] font-bold leading-6 text-ink/50">
          記事の分類に使うタグを追加・編集できます。
        </p>
      </div>

      {setupError && (
        <p className="mt-5 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold leading-5 text-[#76582f]">
          {setupError}
        </p>
      )}

      <section className="mt-5 rounded-2xl border border-ink/[0.07] bg-white p-4 shadow-soft sm:p-5">
        <h2 className="text-[12px] font-black text-ink">{editingId ? "タグを編集" : "新しいタグ"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_90px_auto]">
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!editingId) setSlug(normalizeSlug(event.target.value));
            }}
            placeholder="タグ名"
            aria-label="タグ名"
            className="min-h-11 rounded-xl border border-ink/10 px-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
          />
          <input
            value={slug}
            onChange={(event) => setSlug(normalizeSlug(event.target.value))}
            placeholder="slug"
            aria-label="タグスラッグ"
            className="min-h-11 rounded-xl border border-ink/10 px-3 text-[11px] font-bold text-ink outline-none focus:border-pink"
          />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-ink/10 bg-white px-3">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              aria-label="タグカラー"
              className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            />
            <span className="text-[9px] font-bold text-ink/35">{color}</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={Boolean(setupError) || busyId === (editingId || "new")}
              onClick={() => void save(editingId)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-pink px-4 text-[10px] font-black text-white disabled:opacity-40"
            >
              {busyId === (editingId || "new")
                ? <LoaderCircle size={14} className="animate-spin" />
                : editingId ? <Check size={14} /> : <Plus size={14} />}
              {editingId ? "更新" : "追加"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="編集をキャンセル"
                className="grid h-11 w-11 place-items-center rounded-xl border border-ink/10 text-ink/40"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        {message && <p role="status" className="mt-3 text-[10px] font-bold text-pink">{message}</p>}
      </section>

      <section className="mt-5 overflow-x-auto rounded-2xl border border-ink/[0.07] bg-white shadow-soft">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[minmax(150px,1fr)_minmax(130px,1fr)_70px_78px] gap-3 border-b border-ink/[0.07] bg-[#fffafd] px-4 py-3 text-[9px] font-black tracking-[0.08em] text-ink/35 sm:px-5">
            <span>タグ名</span>
            <span>スラッグ</span>
            <span>記事数</span>
            <span className="text-right">操作</span>
          </div>
          {tags.length > 0 ? tags.map((tag) => (
            <div
              key={tag.id}
              className="grid min-h-16 grid-cols-[minmax(150px,1fr)_minmax(130px,1fr)_70px_78px] items-center gap-3 border-b border-ink/[0.06] px-4 py-3 last:border-0 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                <strong className="truncate text-[11px] font-black text-ink">{tag.name}</strong>
              </div>
              <span className="truncate text-[10px] font-bold text-ink/40">{tag.slug}</span>
              <span className="text-[10px] font-black text-ink/45">{tag.articleCount || 0}</span>
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => beginEdit(tag)}
                  aria-label={`${tag.name}を編集`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink/35 hover:bg-pink/[0.05] hover:text-pink"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  disabled={busyId === tag.id}
                  onClick={() => void remove(tag)}
                  aria-label={`${tag.name}を削除`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink/30 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                >
                  {busyId === tag.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          )) : (
            <div className="px-5 py-14 text-center">
              <Tag size={25} className="mx-auto text-pink/35" />
              <p className="mt-3 text-[11px] font-black text-ink/40">タグはまだありません</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
