"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save } from "lucide-react";
import type { GuideManagementData, GuideConfiguration } from "@/lib/guides/model";

function moved<T>(items: T[], index: number, direction: number): T[] {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
const inputClass = "min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-[14px] text-ink outline-none focus:border-pink focus:ring-2 focus:ring-pink/20";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-pink/20 bg-white px-3 text-[12px] font-bold text-ink hover:bg-pink/5 disabled:opacity-40";

export function GuideManager({ initialData }: { initialData: GuideManagementData }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(initialData.categories[0]?.id ?? "");
  const [eventKey, setEventKey] = useState("");
  const categories = [...data.categories].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
  const guideById = new Map(data.guides.map((guide) => [guide.id, guide]));
  const categoryArticles = data.articles.filter((item) => (item.categoryId ?? "") === selected).sort((a, b) => a.displayOrder - b.displayOrder || (guideById.get(a.id)?.title ?? "").localeCompare(guideById.get(b.id)?.title ?? "", "ja") || a.id.localeCompare(b.id));
  const existing = data.guides.find((guide) => guide.eventKey === eventKey);
  async function save() {
    setBusy(true); setMessage("");
    try {
      const configuration: GuideConfiguration = { preparing: data.preparing, updatedAt: data.updatedAt, categories: data.categories, articles: data.articles };
      const response = await fetch("/api/admin/guides", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(configuration) });
      const result = await response.json() as { data?: GuideManagementData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "設定を保存できませんでした。");
      setData(result.data); setMessage("設定を保存しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "設定を保存できませんでした。"); }
    finally { setBusy(false); }
  }
  function moveCategory(index: number, direction: number) {
    setData((current) => ({ ...current, categories: moved(categories, index, direction).map((item, displayOrder) => ({ ...item, displayOrder })) }));
  }
  function moveArticle(index: number, direction: number) {
    const sorted = moved(categoryArticles, index, direction);
    const positions = new Map(sorted.map((item, displayOrder) => [item.id, displayOrder]));
    setData((current) => ({ ...current, articles: current.articles.map((item) => positions.has(item.id) ? { ...item, displayOrder: positions.get(item.id)! } : item) }));
  }
  return <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-7">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-[26px] font-black text-ink">攻略ガイド管理</h1><p className="mt-2 text-[13px] leading-6 text-ink/60">記事の作成、公開ページの表示、カテゴリと順番を管理します。</p></div><button type="button" onClick={() => void save()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink px-5 text-[13px] font-black text-white disabled:opacity-50"><Save size={17} aria-hidden="true" />{busy ? "保存中…" : "設定を保存"}</button></header>
    {message && <p role="status" className="mt-4 rounded-xl border border-pink/20 bg-white p-3 text-[13px] font-bold text-ink">{message}</p>}
    <fieldset disabled={busy} className="mt-6 min-w-0 space-y-6">
      <legend className="sr-only">攻略ガイドの設定</legend>
      <section className="rounded-2xl border border-pink/15 bg-white p-4 sm:p-5" aria-labelledby="guide-preparing-heading">
        <h2 id="guide-preparing-heading" className="text-[17px] font-black text-ink">公開ページの表示</h2>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-[14px] font-bold text-ink"><input type="checkbox" checked={data.preparing} onChange={(event) => setData((current) => ({ ...current, preparing: event.target.checked }))} className="h-5 w-5 accent-pink" />準備中を表示</label>
        <p className="mt-2 text-[12px] leading-6 text-ink/60">オン：攻略ガイドページに「準備中」を表示します。オフ：公開済みの記事をカテゴリ別に表示します。記事の公開状態は変更しません。</p>
        <Link href="/guides" target="_blank" className="mt-2 inline-flex min-h-11 items-center text-[13px] font-bold text-pink hover:underline">公開ページを確認 ↗</Link>
      </section>
      <section className="rounded-2xl border border-pink/15 bg-white p-4 sm:p-5" aria-labelledby="guide-create-heading">
        <h2 id="guide-create-heading" className="text-[17px] font-black text-ink">攻略記事を作成・編集</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="min-w-0"><span className="mb-2 block text-[12px] font-bold text-ink/60">取り込みイベント</span><select value={eventKey} onChange={(event) => setEventKey(event.target.value)} className={inputClass}><option value="">イベントを選択</option>{data.events.map((event) => <option key={event.key} value={event.key}>{event.name}{data.guides.some((guide) => guide.eventKey === event.key) ? "（作成済み）" : ""}</option>)}</select></label>
          <div className="flex items-end">{eventKey ? <Link className={buttonClass} href={existing ? `/admin/articles/${existing.id}` : `/admin/articles/new?type=strategy&event=${encodeURIComponent(eventKey)}`}>{existing ? "既存の記事を編集" : "このイベントで作成"}</Link> : <span className="pb-3 text-[12px] text-ink/50">1イベントにつき1記事</span>}</div>
        </div>
        <Link href="/admin/articles/new?type=strategy&mode=custom" className={`${buttonClass} mt-4`}><Plus size={16} aria-hidden="true" />自由なタイトルで作成</Link>
        <p className="mt-2 text-[12px] leading-6 text-ink/60">アトラクションやレストランなど、取り込みイベントにないガイドも作成できます。</p>
      </section>
      <section aria-labelledby="guide-order-heading"><h2 id="guide-order-heading" className="mb-3 text-[18px] font-black text-ink">カテゴリ・表示順</h2>
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-2xl border border-pink/15 bg-white p-4">
            <button type="button" className={`${buttonClass} w-full`} onClick={() => { const id = crypto.randomUUID(); setData((current) => ({ ...current, categories: [...current.categories, { id, name: "新しいカテゴリ", displayOrder: categories.length }] })); setSelected(id); }}><Plus size={16} aria-hidden="true" />カテゴリを追加</button>
            <ul className="mt-3 space-y-3">{categories.map((category, index) => <li key={category.id} className={`rounded-xl border p-3 ${selected === category.id ? "border-pink/40 bg-pink/5" : "border-ink/10"}`}>
              <label><span className="sr-only">カテゴリ名 {index + 1}</span><input value={category.name} maxLength={80} onChange={(event) => setData((current) => ({ ...current, categories: current.categories.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item) }))} className={inputClass} /></label>
              <div className="mt-2 flex flex-wrap gap-1"><button type="button" className={buttonClass} onClick={() => setSelected(category.id)}>記事を表示</button><button type="button" disabled={!index} className={buttonClass} aria-label={`${category.name}を上へ`} onClick={() => moveCategory(index, -1)}><ArrowUp size={15} /></button><button type="button" disabled={index === categories.length - 1} className={buttonClass} aria-label={`${category.name}を下へ`} onClick={() => moveCategory(index, 1)}><ArrowDown size={15} /></button><button type="button" className={`${buttonClass} text-red-500`} onClick={() => { setData((current) => ({ ...current, categories: current.categories.filter((item) => item.id !== category.id), articles: current.articles.map((item) => item.categoryId === category.id ? { ...item, categoryId: null } : item) })); if (selected === category.id) setSelected(""); }}>削除</button></div>
            </li>)}</ul>
            <button type="button" className={`${buttonClass} mt-3 w-full`} onClick={() => setSelected("")}>未分類の記事を表示</button>
          </div>
          <div className="min-w-0 rounded-2xl border border-pink/15 bg-white p-4">
            <h3 className="text-[17px] font-black text-ink">{categories.find((category) => category.id === selected)?.name || "未分類"}</h3><p className="mt-2 text-[12px] text-ink/60">上下ボタンで順番を変更し、設定を保存してください。</p>
            {categoryArticles.length ? <ul className="mt-4 divide-y divide-ink/10">{categoryArticles.map((assignment, index) => { const guide = data.guides.find((item) => item.id === assignment.id); if (!guide) return null; return <li key={guide.id} className="py-4">
              <Link href={`/admin/articles/${guide.id}`} className="break-words text-[14px] font-black text-pink hover:underline">{guide.title}</Link><span className="ml-2 text-[11px] text-ink/55">{({ draft: "下書き", published: "公開中", scheduled: "予約公開" })[guide.status]}</span>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={!index} aria-label={`${guide.title}を上へ`} onClick={() => moveArticle(index, -1)}><ArrowUp size={15} /></button><button type="button" className={buttonClass} disabled={index === categoryArticles.length - 1} aria-label={`${guide.title}を下へ`} onClick={() => moveArticle(index, 1)}><ArrowDown size={15} /></button><label className="min-w-0 flex-1"><span className="sr-only">{guide.title}のカテゴリ</span><select value={assignment.categoryId ?? ""} className={inputClass} onChange={(event) => setData((current) => ({ ...current, articles: current.articles.map((item) => item.id === guide.id ? { ...item, categoryId: event.target.value || null, displayOrder: 100000 } : item) }))}><option value="">未分類</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
            </li>; })}</ul> : <p className="mt-5 text-[13px] text-ink/55">このカテゴリの記事はまだありません。</p>}
          </div>
        </div>
      </section>
    </fieldset>
  </div>;
}
