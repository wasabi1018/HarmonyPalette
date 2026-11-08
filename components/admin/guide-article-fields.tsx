"use client";
import Link from "next/link";
import type { GuideEditorOptions } from "@/lib/guides/model";

export type GuideFieldValue = { enabled: boolean; mode: "event" | "custom"; eventKey: string; categoryId: string };
export function GuideArticleFields({ value, options, articleId, locked, onChange }: {
  value: GuideFieldValue; options: GuideEditorOptions; articleId: string; locked: boolean;
  onChange: (value: GuideFieldValue) => void;
}) {
  const existing = options.existingGuides.find((guide) => guide.eventKey === value.eventKey && guide.id !== articleId);
  const input = "mt-2 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-[14px] text-ink focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20 disabled:bg-ink/5";
  return <section className="mb-6 grid gap-3 rounded-2xl border border-pink/20 bg-[#fffafd] p-4 sm:grid-cols-2" aria-label="攻略ガイドの作成設定">
    <label className="block text-[12px] font-bold text-ink">記事の種類<select value={value.enabled ? "strategy" : "article"} disabled={locked} onChange={(event) => onChange({ ...value, enabled: event.target.value === "strategy" })} className={input}><option value="article">通常の記事</option><option value="strategy">攻略ガイド</option></select></label>
    {value.enabled && <>
      <fieldset disabled={locked}><legend className="text-[12px] font-bold text-ink">作成方法</legend><div className="mt-2 flex flex-wrap gap-3">{([['event', '取り込みイベントから選択'], ['custom', '自由入力']] as const).map(([mode, label]) => <label key={mode} className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] font-bold text-ink"><input type="radio" name="guide-create-mode" checked={value.mode === mode} onChange={() => onChange({ ...value, mode })} className="accent-pink" />{label}</label>)}</div></fieldset>
      {value.mode === "event" ? <label className="mt-3 block text-[12px] font-bold text-ink">対象イベント<select value={value.eventKey} disabled={locked} onChange={(event) => onChange({ ...value, eventKey: event.target.value })} className={input}><option value="">イベントを選択</option>{value.eventKey && !options.events.some((event) => event.key === value.eventKey) && <option value={value.eventKey}>保存済みの対象イベント</option>}{options.events.map((event) => <option key={event.key} value={event.key}>{event.name}{options.existingGuides.some((guide) => guide.eventKey === event.key) ? "（作成済み）" : ""}</option>)}</select></label> : <p className="mt-3 text-[12px] leading-6 text-ink/60">アトラクションやレストランなど、記事タイトルを自由に入力してください。</p>}
      {existing && value.mode === "event" && <p className="mt-3 text-[13px] font-bold text-pink sm:col-span-2">このイベントの記事は作成済みです。<Link href={`/admin/articles/${existing.id}`} className="ml-1 inline-flex min-h-11 items-center underline">既存の記事を編集</Link></p>}
      <label className="mt-3 block text-[12px] font-bold text-ink">攻略ガイドのカテゴリ<select value={value.categoryId} onChange={(event) => onChange({ ...value, categoryId: event.target.value })} className={input}><option value="">未分類</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <Link href="/admin/guides" target="_blank" className="inline-flex min-h-11 items-center text-[12px] font-bold text-pink underline sm:col-span-2">カテゴリと表示順を管理 ↗</Link>
    </>}
  </section>;
}
