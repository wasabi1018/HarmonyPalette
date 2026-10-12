"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, RefreshCw, X } from "lucide-react";
import {
  captureCard, CharacterRecommendationCard, scheduleUrl, usePreviewScale,
} from "@/components/admin/character-recommendation-studio";
import { useInstagramSessionState, useInstagramUnsavedChanges } from "@/components/admin/instagram-session-provider";
import type { PreparedInstagramDmAsset } from "@/lib/instagram-admin-session";
import {
  buildCharacterRecommendationMessage, buildCharacterRecommendations,
} from "@/lib/character-recommendation";
import type { InitialCharacterData } from "@/lib/character-store";
import type { InitialParkOperatingDayData } from "@/lib/park-operating-day-store";
import type { InitialScheduleData } from "@/lib/schedule-store";

type AssetEdits = { keywords?: string; dmText?: string };
type Props = {
  initialScheduleData: InitialScheduleData;
  initialCharacterData: InitialCharacterData;
  initialParkOperatingDayData: InitialParkOperatingDayData;
};

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-pink focus:ring-4 focus:ring-pink/10";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-5 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40";

function currentMonthInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).format(new Date());
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "保存に失敗しました。");
  return data as T;
}

export function InstagramDmNewCampaign({ initialScheduleData, initialCharacterData, initialParkOperatingDayData }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthInJapan);
  const [reelUrl, setReelUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("");
  const [edits, setEdits] = useState<Record<string, AssetEdits>>({});
  const [createdId, setCreatedId] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [prepared, setPrepared] = useInstagramSessionState<PreparedInstagramDmAsset | null>("dm.prepared-asset", null);
  const [usePreparedImage, setUsePreparedImage] = useState(true);
  const [preparedPreviewUrl, setPreparedPreviewUrl] = useState("");
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const submittingRef = useRef(false);
  const preparedAppliedRef = useRef(false);

  useInstagramUnsavedChanges("dm.new-campaign-with-assets", Boolean(reelUrl || selectedIds.length || createdId));

  useEffect(() => {
    if (!prepared || preparedAppliedRef.current || selectedIds.length || createdId) return;
    const character = initialCharacterData.characters.find((item) => item.name === prepared.characterName);
    if (!character) return;
    preparedAppliedRef.current = true;
    setMonth(prepared.month);
    setSelectedIds([character.id]);
    setActiveId(character.id);
    setEdits({ [character.id]: { keywords: prepared.keywords, dmText: prepared.dmText } });
  }, [prepared, initialCharacterData.characters, selectedIds.length, createdId]);

  useEffect(() => {
    if (!prepared || !usePreparedImage) return;
    const url = URL.createObjectURL(prepared.file);
    setPreparedPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [prepared, usePreparedImage]);

  const closedDates = useMemo(() => new Set(initialParkOperatingDayData.operatingDays
    .filter((day) => day.operatingStatus === "closed")
    .map((day) => day.date)), [initialParkOperatingDayData.operatingDays]);
  const selectedAssets = useMemo(() => selectedIds.flatMap((id) => {
    const character = initialCharacterData.characters.find((item) => item.id === id);
    if (!character) return [];
    const days = buildCharacterRecommendations(month, character, initialScheduleData.entries, closedDates);
    const dmText = buildCharacterRecommendationMessage({
      month, characterName: character.name, days, detailsUrl: scheduleUrl(month, character.name),
    });
    return [{ character, days, dmText }];
  }), [selectedIds, initialCharacterData.characters, month, initialScheduleData.entries, closedDates]);
  const activeAsset = selectedAssets.find((item) => item.character.id === activeId) ?? selectedAssets[0];
  const usingPreparedImage = (characterName: string) => Boolean(prepared && usePreparedImage
    && prepared.month === month && prepared.characterName === characterName);
  const showingPreparedPreview = Boolean(activeAsset && usingPreparedImage(activeAsset.character.name) && preparedPreviewUrl);
  const { containerRef, scale } = usePreviewScale(Boolean(activeAsset) && !showingPreparedPreview);
  const dataReady = initialScheduleData.status === "success" && initialCharacterData.status === "success" && initialParkOperatingDayData.status === "success";
  const canSave = !busy && dataReady && selectedAssets.length > 0 && selectedAssets.length === selectedIds.length
    && selectedAssets.every((item) => item.days.length > 0 || usingPreparedImage(item.character.name));

  function updateAsset(id: string, field: keyof AssetEdits, value: string) {
    setEdits((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || submittingRef.current) return;
    submittingRef.current = true;
    void (async () => {
      setBusy(true);
      setError("");
      try {
        const pending = selectedAssets.filter((item) => !savedIds.includes(item.character.id));
        for (const item of pending) {
          const keywords = (edits[item.character.id]?.keywords ?? item.character.name)
            .split(/[,、\n]/).map((word) => word.trim()).filter(Boolean);
          const dmText = (edits[item.character.id]?.dmText ?? item.dmText).trim();
          if (keywords.length < 1 || keywords.length > 20 || keywords.some((word) => word.length > 80)
            || !dmText || dmText.length > 1000) {
            throw new Error(`${item.character.name}のキーワードまたはDM文章を確認してください。`);
          }
        }
        const files: Array<{ id: string; file: File }> = [];
        for (const [index, item] of pending.entries()) {
          setProgress(`画像を準備中（${index + 1}/${pending.length}）`);
          if (usingPreparedImage(item.character.name)) {
            if (prepared!.file.type !== "image/png" || prepared!.file.size > 8 * 1024 * 1024) {
              throw new Error("引き継いだ画像は8MB以下のPNGにしてください。");
            }
            files.push({ id: item.character.id, file: prepared!.file });
            continue;
          }
          const node = cardRefs.current.get(item.character.id);
          if (!node) throw new Error(`${item.character.name}の画像プレビューがまだ準備できていません。`);
          const blob = await captureCard(node);
          if (blob.size > 8 * 1024 * 1024) throw new Error(`${item.character.name}の画像が8MBを超えました。`);
          files.push({
            id: item.character.id,
            file: new File([blob], `harmony-palette_oshi_${item.character.slug}_${month}.png`, { type: "image/png" }),
          });
        }

        let campaignId = createdId;
        if (!campaignId) {
          setProgress("Reelを確認して下書きを作成中…");
          const result = await requestJson<{ id: string }>("/api/admin/instagram-dm/campaigns", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month, reelUrl }),
          });
          campaignId = result.id;
          setCreatedId(campaignId);
        }

        for (const [index, item] of pending.entries()) {
          setProgress(`画像とDM文章を登録中（${index + 1}/${pending.length}）`);
          const form = new FormData();
          form.set("campaignId", campaignId);
          form.set("characterName", item.character.name);
          form.set("keywords", edits[item.character.id]?.keywords ?? item.character.name);
          form.set("dmText", edits[item.character.id]?.dmText ?? item.dmText);
          form.set("image", files[index].file);
          await requestJson("/api/admin/instagram-dm/assets", { method: "POST", body: form });
          setSavedIds((current) => [...current, item.character.id]);
          if (prepared?.month === month && prepared.characterName === item.character.name) setPrepared(null);
        }
        setProgress("下書きに登録しました。内容確認画面を開きます…");
        router.push(`/admin/instagram/dm/${campaignId}`);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "保存に失敗しました。");
        setProgress("");
      } finally {
        submittingRef.current = false;
        setBusy(false);
      }
    })();
  }

  return <form onSubmit={submit} className="space-y-5 rounded-[24px] border border-pink/15 bg-white p-4 shadow-soft sm:p-6">
    <section className="grid gap-4 sm:grid-cols-2">
      <label className="block text-[12px] font-bold text-ink/70">対象月
        <input className={inputClass} type="month" value={month} required disabled={busy || Boolean(createdId)} onChange={(event) => {
          setMonth(event.target.value); setEdits({});
        }} />
      </label>
      <label className="block text-[12px] font-bold text-ink/70">ReelのURL
        <input className={inputClass} type="url" inputMode="url" value={reelUrl} required maxLength={2048} disabled={busy || Boolean(createdId)} placeholder="https://www.instagram.com/reel/…/" onChange={(event) => setReelUrl(event.target.value)} />
        <span className="mt-2 block text-[11px] font-normal leading-5 text-ink/60">連携済みアカウントの投稿URLを入力してください。</span>
      </label>
    </section>

    <section className="border-t border-pink/10 pt-5">
      <h2 className="text-[17px] font-black text-ink">対象キャラクター</h2>
      <p className="mt-1 text-[12px] leading-6 text-ink/60">選ぶと、コメントのキーワード・DM文章・ランキング画像を自動で用意します。複数選べます。</p>
      {prepared && <div className="mt-3 rounded-xl bg-lavender/10 p-3 text-[12px] leading-6 text-ink/70"><p>画像作成画面で準備した{prepared.characterName}の素材を引き継いでいます。{!initialCharacterData.characters.some((item) => item.name === prepared.characterName) && "該当キャラクターを選択できない場合は、キャラクター登録を確認してください。"}</p><button type="button" className="mt-1 min-h-10 font-bold text-pink underline" disabled={busy || Boolean(createdId)} onClick={() => {
        const character = initialCharacterData.characters.find((item) => item.name === prepared.characterName);
        if (character) setEdits((current) => { const next = { ...current }; delete next[character.id]; return next; });
        setPrepared(null);
      }}>引き継いだ素材を使わない</button></div>}
      <label className="mt-4 block max-w-md text-[12px] font-bold text-ink/70">キャラクターを追加
        <select className={inputClass} value="" disabled={busy || Boolean(createdId) || !dataReady} onChange={(event) => {
          const id = event.target.value;
          if (id) setSelectedIds((current) => current.includes(id) ? current : [...current, id]);
          if (id) setActiveId(id);
          if (id && prepared) {
            const character = initialCharacterData.characters.find((item) => item.id === id);
            if (character?.name === prepared.characterName && month === prepared.month) {
              setEdits((current) => ({ ...current, [id]: { keywords: prepared.keywords, dmText: prepared.dmText } }));
            }
          }
        }}>
          <option value="">選択してください</option>
          {initialCharacterData.characters.filter((item) => !selectedIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {!dataReady && <div role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-[12px] leading-6 text-amber-900"><p>公開スケジュール・キャラクター・営業日のデータを確認できません。取得後に選択してください。</p><button type="button" className="mt-2 inline-flex min-h-10 items-center gap-2 font-bold underline" onClick={() => router.refresh()}><RefreshCw size={14} aria-hidden="true" />再読み込み</button></div>}
      {dataReady && initialCharacterData.characters.length === 0 && <p role="alert" className="mt-3 text-[12px] text-amber-900">登録済みのキャラクターがありません。</p>}
      {selectedAssets.length === 0 && <p className="mt-4 rounded-xl bg-[#fff7fa] p-4 text-[12px] text-ink/60">まず対象キャラクターを追加してください。</p>}
      <div className="mt-4 space-y-4">{selectedAssets.map((item) => {
        const id = item.character.id;
        const saved = savedIds.includes(id);
        return <article key={id} className="rounded-2xl border border-pink/15 bg-[#fffafd] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="text-[15px] font-black text-ink">{item.character.name}</h3><p className="mt-1 text-[11px] text-ink/60">{saved ? "下書きに登録済み" : `${item.days.length}日分の登場予定から自動作成`}</p></div>
            <div className="flex gap-2"><button type="button" className="min-h-10 rounded-xl border border-pink/20 px-3 text-[11px] font-bold text-pink" onClick={() => setActiveId(id)}>画像を見る</button><button type="button" aria-label={`${item.character.name}を外す`} className="grid h-10 w-10 place-items-center rounded-xl text-ink/60 disabled:opacity-40" disabled={busy || Boolean(createdId)} onClick={() => {
              setSelectedIds((current) => current.filter((selected) => selected !== id));
              setEdits((current) => { const next = { ...current }; delete next[id]; return next; });
            }}><X size={16} aria-hidden="true" /></button></div>
          </div>
          {item.days.length === 0 && !usingPreparedImage(item.character.name) && <p role="alert" className="mt-3 text-[12px] font-bold text-red-700">この月の登場予定がないため、画像を作成できません。</p>}
          {prepared && prepared.month === month && prepared.characterName === item.character.name && <button type="button" className="mt-3 min-h-10 text-[11px] font-bold text-pink underline" disabled={busy || saved} onClick={() => setUsePreparedImage((current) => !current)}>{usePreparedImage ? "画像を現在の公開予定から作り直す" : "作成済みの画像を使う"}</button>}
          <label className="mt-4 block text-[12px] font-bold text-ink/70">コメントのキーワード
            <input className={inputClass} value={edits[id]?.keywords ?? item.character.name} onChange={(event) => updateAsset(id, "keywords", event.target.value)} required disabled={busy || saved} placeholder="クロミ、くろみ" />
          </label>
          <label className="mt-4 block text-[12px] font-bold text-ink/70">DM文章
            <textarea className={`${inputClass} min-h-36 whitespace-pre-wrap`} value={edits[id]?.dmText ?? item.dmText} onChange={(event) => updateAsset(id, "dmText", event.target.value)} required maxLength={1000} disabled={busy || saved} />
          </label>
        </article>;
      })}</div>
    </section>

    {activeAsset && <section className="border-t border-pink/10 pt-5">
      <h2 className="text-[17px] font-black text-ink">{activeAsset.character.name}の送信画像プレビュー</h2>
      <p className="mt-1 text-[11px] text-ink/60">{usingPreparedImage(activeAsset.character.name) ? "画像作成画面から引き継いだPNGを使います。" : "1080 × 1350pxのPNGを保存時に自動生成します。"}</p>
      <div className="mt-4 rounded-2xl bg-[#f5eef3] p-3 sm:p-5">{showingPreparedPreview
        ? <div role="img" aria-label={`${activeAsset.character.name}の送信画像`} className="mx-auto aspect-[4/5] w-full max-w-[640px] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${preparedPreviewUrl})` }} />
        : <div ref={containerRef} className="mx-auto w-full max-w-[640px] overflow-hidden"><div style={{ width: 1080 * scale, height: 1350 * scale }}><div style={{ width: 1080, height: 1350, transform: `scale(${scale})`, transformOrigin: "top left" }}><CharacterRecommendationCard month={month} character={activeAsset.character} days={activeAsset.days} /></div></div></div>}
      </div>
    </section>}

    <div aria-hidden="true" style={{ position: "fixed", left: -20000, top: 0, width: 1080, pointerEvents: "none" }}>
      {selectedAssets.map((item) => <div key={item.character.id} ref={(node) => { if (node) cardRefs.current.set(item.character.id, node); else cardRefs.current.delete(item.character.id); }} style={{ width: 1080, height: 1350 }}><CharacterRecommendationCard month={month} character={item.character} days={item.days} /></div>)}
    </div>

    {createdId && <p className="rounded-xl bg-amber-50 p-3 text-[12px] leading-6 text-amber-900">下書きは作成済みです。登録できなかった素材だけ再試行できます。<Link className="ml-1 font-bold underline" href={`/admin/instagram/dm/${createdId}`}>下書きを確認</Link></p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-[12px] leading-6 text-red-700">{error}</p>}
    {progress && <p role="status" className="text-[12px] font-bold text-[#35745f]">{progress}</p>}
    <button type="submit" className={buttonClass} disabled={!canSave}>{busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{busy ? "登録中…" : createdId ? "残りの素材を登録" : "画像とDM文章をまとめて下書き保存"}</button>
    <p className="text-[11px] leading-5 text-ink/60">下書き保存だけでは自動返信は始まりません。内容確認画面で「自動返信を開始」を押してください。</p>
  </form>;
}
