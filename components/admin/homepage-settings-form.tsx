"use client";

import Link from "next/link";
import { LoaderCircle, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useInstagramSessionState, useInstagramUnsavedChanges } from "./instagram-session-provider";
import { HomepageGuideCards } from "@/components/homepage-guide-cards";
import { normalizeHomepageGuideCards, type HomepageGuideCard } from "@/lib/homepage-guide-cards";

export function HomepageSettingsForm({ initialCards, setupError = "" }: { initialCards: HomepageGuideCard[]; setupError?: string }) {
  const [cards, setCards] = useInstagramSessionState<HomepageGuideCard[]>("homepage.guide-cards", initialCards);
  const [savedCards, setSavedCards] = useInstagramSessionState<HomepageGuideCard[]>("homepage.saved-guide-cards", initialCards);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const changed = JSON.stringify(cards) !== JSON.stringify(savedCards);
  useInstagramUnsavedChanges("homepage-settings", changed);

  const update = (index: number, key: keyof HomepageGuideCard, value: string) => {
    setCards((current) => current.map((card, itemIndex) => itemIndex === index ? { ...card, [key]: value } : card));
    setMessage("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setMessage(""); setIsError(false);
    try {
      const normalized = normalizeHomepageGuideCards(cards);
      const response = await fetch("/api/admin/homepage-settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guideCards: normalized }),
      });
      const data = await response.json() as { settings?: { guideCards: HomepageGuideCard[] }; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error || "TOPページ設定を保存できませんでした。");
      setCards(data.settings.guideCards); setSavedCards(data.settings.guideCards);
      setMessage("保存しました。TOPページを再読み込みすると反映されます。");
    } catch (error) {
      setIsError(true); setMessage(error instanceof Error ? error.message : "設定を保存できませんでした。");
    } finally { setSaving(false); }
  };

  let previewCards: HomepageGuideCard[] | null = null;
  try { previewCards = normalizeHomepageGuideCards(cards); } catch { /* Preview only valid links. */ }

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-5">
      <section className="rounded-[22px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[21px] font-black text-ink">来園に役立つガイド</h2>
        <p className="mt-2 text-[13px] leading-6 text-ink/70">TOPページの予定表の下に表示する3枚のカードを編集します。上から順に表示されます。</p>
        {setupError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{setupError}</p>}
        <fieldset disabled={saving || Boolean(setupError)} className="mt-5 grid gap-4 lg:grid-cols-3">
          <legend className="sr-only">ガイドカードの編集</legend>
          {cards.map((card, index) => (
            <div key={index} className="min-w-0 rounded-2xl border border-ink/10 p-4">
              <h3 className="mb-4 text-sm font-black text-[#b43e68]">カード {index + 1}</h3>
              <label className="block text-[13px] font-bold text-ink">見出し
                <input aria-label={`カード${index + 1}の見出し`} required maxLength={80} value={card.title} onChange={(event) => update(index, "title", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm font-medium outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" />
              </label>
              <label className="mt-4 block text-[13px] font-bold text-ink">リンク先URL
                <input aria-label={`カード${index + 1}のURL`} required maxLength={2048} value={card.url} onChange={(event) => update(index, "url", event.target.value)} spellCheck={false} aria-describedby="guide-url-help" className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm font-medium outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" />
              </label>
              <label className="mt-4 block text-[13px] font-bold text-ink">説明文
                <textarea aria-label={`カード${index + 1}の説明文`} required maxLength={180} rows={3} value={card.description} onChange={(event) => update(index, "description", event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-ink/15 px-3 py-2 text-sm font-medium leading-6 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" />
              </label>
            </div>
          ))}
        </fieldset>
        <p id="guide-url-help" className="mt-4 text-[12px] leading-5 text-ink/70">URLは /articles/... などのサイト内パス、または https:// で始まるURLを入力してください。</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p role={isError ? "alert" : "status"} className={`text-[13px] leading-6 ${isError ? "text-red-700" : "text-ink/70"}`}>{message || (changed ? "未保存の変更があります。" : "")}</p>
          <button type="submit" disabled={saving || Boolean(setupError) || !changed} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c94372] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {saving ? "保存中…" : "TOPページ設定を保存"}
          </button>
        </div>
      </section>
      <section className="rounded-[22px] border border-pink/10 bg-[#fff8fb] p-4 sm:p-6" aria-label="ガイドカードのプレビュー">
        <h2 className="mb-4 text-lg font-black text-ink">表示プレビュー</h2>
        {previewCards ? <HomepageGuideCards cards={previewCards} /> : <p className="text-sm text-ink/70">すべてのカードの見出し・URL・説明文を入力すると、プレビューを表示します。</p>}
        <Link href="/" target="_blank" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#b43e68] hover:underline">TOPページを確認する</Link>
      </section>
    </form>
  );
}
