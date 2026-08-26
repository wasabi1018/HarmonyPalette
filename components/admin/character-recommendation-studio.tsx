"use client";

import {
  CalendarHeart,
  CircleAlert,
  Clipboard,
  ExternalLink,
  ImageDown,
  Link2,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { toBlob } from "html-to-image";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Character } from "@/data/types";
import {
  buildCharacterRecommendations,
  recommendationRank,
  type CharacterRecommendationDay,
} from "@/lib/character-recommendation";
import { type InitialCharacterData, useCharacters } from "@/lib/character-store";
import {
  type InitialParkOperatingDayData,
  useParkOperatingDays,
} from "@/lib/park-operating-day-store";
import { type InitialScheduleData, useScheduleEntries } from "@/lib/schedule-store";
import { siteUrl } from "@/lib/site-config";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function dateParts(value: string) {
  const date = dateFromIso(value);
  return {
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: WEEKDAYS[date.getUTCDay()],
    weekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
  };
}

function formatShortDate(value: string) {
  const parts = dateParts(value);
  return `${parts.month}/${parts.day}(${parts.weekday})`;
}

function validAccent(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#eb6e98";
}

function scheduleUrl(month: string, characterName: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    character: characterName,
    from: `${month}-01`,
    to: lastDay,
    view: "calendar",
  });
  return siteUrl(`/schedule?${params.toString()}#schedule-results`);
}

function recommendationMessage(
  month: string,
  character: Character | undefined,
  days: CharacterRecommendationDay[],
) {
  if (!character || days.length === 0) return "対象月に掲載中の登場予定がありません。";
  const [, monthNumber] = month.split("-").map(Number);
  const bestCount = days[0].count;
  const bestDays = days.filter((day) => day.count === bestCount);
  const bestDateText = bestDays.slice(0, 3).map((day) => formatShortDate(day.date)).join("・");
  const moreBestDays = bestDays.length > 3 ? `ほか${bestDays.length - 3}日` : "";
  const next = days.find((day) => day.count < bestCount);
  const nextLine = next
    ? `\n次点は${formatShortDate(next.date)}（${next.count}件）です。`
    : "";

  return `${character.name}推しさんへ🩷
${monthNumber}月のおすすめ日は${bestDateText}${moreBestDays ? `・${moreBestDays}` : ""}！
公開中の登場予定は${bestCount}件で、対象月最多です。${nextLine}

詳しい時間・場所はこちら👇
${scheduleUrl(month, character.name)}

※掲載予定は変更になる場合があります。お出かけ前に公式サイトの最新情報もご確認ください。`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function captureCard(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }
    if (typeof image.decode === "function") await image.decode().catch(() => undefined);
  }));

  const blob = await toBlob(node, {
    skipFonts: true,
    pixelRatio: 1,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#fff",
  });
  if (!blob) throw new Error("画像を作成できませんでした。");
  return blob;
}

function usePreviewScale() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setScale(Math.min(1, container.clientWidth / CARD_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return { containerRef, scale };
}

function RankingDate({
  day,
  rank,
  accent,
  featured = false,
}: {
  day: CharacterRecommendationDay;
  rank: number;
  accent: string;
  featured?: boolean;
}) {
  const parts = dateParts(day.date);
  return (
    <div
      style={{
        display: "flex",
        minWidth: 0,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 22,
        border: featured ? `4px solid ${accent}` : `2px solid ${accent}2e`,
        borderRadius: featured ? 34 : 24,
        background: "#fff",
        padding: featured ? "28px 36px" : "22px 28px",
        boxShadow: featured ? `0 18px 44px ${accent}22` : "0 8px 22px rgba(87,66,80,0.06)",
      }}
    >
      <div style={{ display: "flex", minWidth: 0, alignItems: "center", gap: featured ? 26 : 18 }}>
        <span
          style={{
            display: "grid",
            width: featured ? 82 : 60,
            height: featured ? 82 : 60,
            flex: "0 0 auto",
            placeItems: "center",
            borderRadius: 999,
            background: rank === 1 ? accent : `${accent}18`,
            color: rank === 1 ? "#fff" : accent,
            fontSize: featured ? 31 : 23,
            fontWeight: 900,
          }}
        >
          {rank}
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 9, whiteSpace: "nowrap" }}>
          <strong style={{ fontSize: featured ? 78 : 50, fontWeight: 900, letterSpacing: "-0.055em" }}>
            {parts.month}/{parts.day}
          </strong>
          <span
            style={{
              color: parts.weekend ? accent : "#817681",
              fontSize: featured ? 31 : 24,
              fontWeight: 900,
            }}
          >
            ({parts.weekday})
          </span>
        </div>
      </div>
      <span
        style={{
          flex: "0 0 auto",
          borderRadius: 999,
          background: `${accent}15`,
          color: accent,
          padding: featured ? "15px 23px" : "11px 18px",
          fontSize: featured ? 27 : 21,
          fontWeight: 900,
        }}
      >
        予定 {day.count}件
      </span>
    </div>
  );
}

export function CharacterRecommendationCard({
  month,
  character,
  days,
}: {
  month: string;
  character: Character | undefined;
  days: CharacterRecommendationDay[];
}) {
  const accent = validAccent(character?.themeColor ?? "");
  const [year, monthNumber] = month.split("-").map(Number);
  const topDays = days.slice(0, 3);
  const bestCount = days[0]?.count ?? 0;
  const tiedBestCount = days.filter((day) => day.count === bestCount).length;
  const primaryAppearances = days[0]?.appearances.slice(0, 4) ?? [];
  const hiddenAppearanceCount = Math.max(0, (days[0]?.appearances.length ?? 0) - primaryAppearances.length);

  return (
    <article
      style={{
        position: "relative",
        boxSizing: "border-box",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        overflow: "hidden",
        background: `linear-gradient(145deg, #ffffff 0%, ${accent}0d 54%, #ffffff 100%)`,
        color: "#4a4148",
        fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
        padding: "58px 66px 44px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -120,
          top: -150,
          width: 440,
          height: 440,
          borderRadius: 999,
          background: `${accent}12`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -230,
          left: -170,
          width: 500,
          height: 500,
          borderRadius: 999,
          background: `${accent}0d`,
        }}
      />

      <header style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Image
          src="/logo-compact.png"
          alt="Harmony Palette"
          width={309}
          height={52}
          priority
          unoptimized
          style={{ display: "block", width: "auto", height: 52, objectFit: "contain" }}
        />
        <span
          style={{
            borderRadius: 999,
            background: `${accent}16`,
            color: accent,
            padding: "11px 22px",
            fontSize: 19,
            fontWeight: 900,
            letterSpacing: "0.12em",
          }}
        >
          OSHI CHARACTER GUIDE
        </span>
      </header>

      <main style={{ position: "relative", marginTop: 48 }}>
        <p style={{ margin: 0, color: accent, fontSize: 25, fontWeight: 900, letterSpacing: "0.09em" }}>
          {year}年{monthNumber}月
        </p>
        <h1
          style={{
            margin: "10px 0 0",
            fontSize: (character?.name.length ?? 0) >= 9 ? 55 : 66,
            fontWeight: 900,
            letterSpacing: "-0.045em",
            lineHeight: 1.15,
          }}
        >
          {character ? `${character.name}推しさんへ` : "キャラクターを選択"}
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 38, fontWeight: 900, letterSpacing: "-0.03em" }}>
          行くならこの日！
        </p>

        {topDays.length > 0 ? (
          <>
            <div style={{ marginTop: 34 }}>
              <RankingDate day={topDays[0]} rank={1} accent={accent} featured />
              {tiedBestCount > 1 && (
                <p style={{ margin: "12px 6px 0", color: accent, fontSize: 18, fontWeight: 900 }}>
                  同率1位が{tiedBestCount}日あります
                </p>
              )}
            </div>

            {topDays.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
                {topDays.slice(1).map((day, index) => (
                  <RankingDate
                    key={day.date}
                    day={day}
                    rank={recommendationRank(days, index + 1)}
                    accent={accent}
                  />
                ))}
              </div>
            )}

            <section
              style={{
                marginTop: 30,
                borderRadius: 28,
                background: "rgba(255,255,255,0.82)",
                padding: "24px 30px",
                boxShadow: "0 10px 28px rgba(87,66,80,0.055)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
                <h2 style={{ margin: 0, fontSize: 25, fontWeight: 900 }}>
                  {formatShortDate(days[0].date)} の予定
                </h2>
                <span style={{ color: accent, fontSize: 17, fontWeight: 900 }}>PICK UP</span>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 17 }}>
                {primaryAppearances.map((appearance) => (
                  <div
                    key={appearance.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "94px minmax(0,1fr)",
                      alignItems: "center",
                      gap: 16,
                      minHeight: 53,
                    }}
                  >
                    <time style={{ color: accent, fontSize: 21, fontWeight: 900 }}>{appearance.time}</time>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 20, fontWeight: 900 }}>
                        {appearance.title}
                      </p>
                      <p style={{ margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#8b8189", fontSize: 15, fontWeight: 800 }}>
                        {appearance.location}
                      </p>
                    </div>
                  </div>
                ))}
                {hiddenAppearanceCount > 0 && (
                  <p style={{ margin: "2px 0 0 110px", color: accent, fontSize: 17, fontWeight: 900 }}>
                    ほか{hiddenAppearanceCount}件
                  </p>
                )}
              </div>
            </section>
          </>
        ) : (
          <div
            style={{
              display: "grid",
              minHeight: 500,
              placeItems: "center",
              marginTop: 40,
              border: `3px dashed ${accent}44`,
              borderRadius: 32,
              background: "rgba(255,255,255,0.72)",
              padding: 50,
              textAlign: "center",
            }}
          >
            <div>
              <CalendarHeart size={72} color={accent} />
              <p style={{ margin: "24px 0 0", fontSize: 30, fontWeight: 900 }}>
                この月の登場予定は<br />まだ掲載されていません
              </p>
            </div>
          </div>
        )}
      </main>

      <footer
        style={{
          position: "absolute",
          right: 66,
          bottom: 34,
          left: 66,
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "#80767e",
        }}
      >
        <CircleAlert size={29} color={accent} fill={`${accent}16`} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, lineHeight: 1.55 }}>
          公開中のスケジュールを日別に集計しています。内容は変更になる場合があります。<br />お出かけ前に公式サイトの最新情報をご確認ください。
        </p>
      </footer>
    </article>
  );
}

export function CharacterRecommendationStudio({
  initialScheduleData,
  initialCharacterData,
  initialParkOperatingDayData,
}: {
  initialScheduleData: InitialScheduleData;
  initialCharacterData: InitialCharacterData;
  initialParkOperatingDayData: InitialParkOperatingDayData;
}) {
  const scheduleState = useScheduleEntries({ fallbackToBundled: true, initialData: initialScheduleData });
  const characterState = useCharacters({ initialData: initialCharacterData });
  const operatingDayState = useParkOperatingDays(initialParkOperatingDayData);
  const today = useMemo(todayInJapan, []);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedCharacterId, setSelectedCharacterId] = useState(initialCharacterData.characters[0]?.id ?? "");
  const [feedback, setFeedback] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDisplaying, setIsDisplaying] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const { containerRef, scale } = usePreviewScale();

  useEffect(() => {
    if (characterState.characters.some((character) => character.id === selectedCharacterId)) return;
    setSelectedCharacterId(characterState.characters[0]?.id ?? "");
  }, [characterState.characters, selectedCharacterId]);

  const character = characterState.characters.find((item) => item.id === selectedCharacterId);
  const closedDates = useMemo(() => new Set(
    operatingDayState.operatingDays
      .filter((day) => day.operatingStatus === "closed")
      .map((day) => day.date),
  ), [operatingDayState.operatingDays]);
  const recommendations = useMemo(
    () => character
      ? buildCharacterRecommendations(selectedMonth, character, scheduleState.entries, closedDates)
      : [],
    [character, closedDates, scheduleState.entries, selectedMonth],
  );
  const message = useMemo(
    () => recommendationMessage(selectedMonth, character, recommendations),
    [character, recommendations, selectedMonth],
  );
  const isBusy = isDownloading || isDisplaying;
  const canCreate = Boolean(character && recommendations.length > 0);

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(successMessage);
    } catch {
      setFeedback("コピーできませんでした。表示された文章を選択してコピーしてください。");
    }
  };

  const getBlob = async () => {
    if (!cardRef.current) throw new Error("画像の準備ができていません。");
    return captureCard(cardRef.current);
  };

  const handleDownload = async () => {
    if (!character) return;
    setIsDownloading(true);
    setFeedback("");
    try {
      const blob = await getBlob();
      downloadBlob(blob, `harmony-palette_oshi_${character.slug}_${selectedMonth}.png`);
      setFeedback("コメント返信用画像を保存しました。");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "画像の作成に失敗しました。");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDisplay = async () => {
    const imageWindow = window.open("about:blank", "_blank");
    if (!imageWindow) {
      setFeedback("画像を表示できませんでした。ブラウザのポップアップを許可してください。");
      return;
    }
    imageWindow.document.body.textContent = "画像を準備しています…";
    setIsDisplaying(true);
    setFeedback("");
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const image = imageWindow.document.createElement("img");
      image.src = url;
      image.alt = `${character?.name ?? "キャラクター"}のおすすめ日画像`;
      image.style.display = "block";
      image.style.width = "100%";
      image.style.maxWidth = `${CARD_WIDTH}px`;
      image.style.height = "auto";
      image.style.margin = "0 auto";
      imageWindow.document.title = `${character?.name ?? "キャラクター"}のおすすめ日`;
      imageWindow.document.body.style.margin = "0";
      imageWindow.document.body.style.background = "#f5f0f4";
      imageWindow.document.body.replaceChildren(image);
      image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    } catch (error) {
      imageWindow.close();
      setFeedback(error instanceof Error ? error.message : "画像の表示に失敗しました。");
    } finally {
      setIsDisplaying(false);
    }
  };

  return (
    <section className="mb-7 rounded-[28px] border border-pink/15 bg-gradient-to-br from-[#fff7fa] via-white to-[#f5f1fb] p-4 shadow-soft sm:p-6 lg:p-7">
      <div className="flex flex-col gap-3 border-b border-pink/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-pink">
            <Sparkles size={14} aria-hidden="true" />
            COMMENT REPLY MAKER
          </p>
          <h2 className="mt-1 text-[22px] font-black text-ink">推しキャラおすすめ日画像</h2>
          <p className="mt-2 max-w-[760px] text-[12px] font-bold leading-6 text-ink/50">
            対象月とキャラクターを選ぶと、登場予定が多い日を自動集計して、コメント返信用の画像とDM文章を作成します。
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-black text-lavender shadow-sm">
          <CalendarHeart size={14} aria-hidden="true" />
          1080 × 1350px
        </span>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
        <aside className="grid gap-4">
          <section className="rounded-[22px] border border-pink/10 bg-white p-5 shadow-soft">
            <p className="text-[10px] font-black tracking-[0.16em] text-pink">1. TARGET</p>
            <h3 className="mt-1 text-[17px] font-black text-ink">月とキャラクター</h3>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-black text-ink/55">対象月</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  if (event.target.value) setSelectedMonth(event.target.value);
                }}
                className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-black text-ink/55">対象キャラクター</span>
              <select
                value={selectedCharacterId}
                onChange={(event) => setSelectedCharacterId(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10"
              >
                {characterState.characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <div className="mt-4 rounded-xl bg-mint/10 px-3 py-3 text-[11px] font-bold leading-5 text-[#35745f]">
              {recommendations.length > 0
                ? `${recommendations.length}日分の登場予定から、おすすめ日を作成しました。`
                : "この条件で掲載中の登場予定はありません。"}
            </div>
            {recommendations[0] && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {recommendations.slice(0, 3).map((day, index) => (
                  <div key={day.date} className="rounded-xl border border-pink/10 bg-[#fffafd] px-2 py-2.5 text-center">
                    <p className="text-[9px] font-black text-pink">{recommendationRank(recommendations, index)}位</p>
                    <p className="mt-1 text-[11px] font-black text-ink">{formatShortDate(day.date)}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-ink/40">{day.count}件</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[22px] border border-lavender/15 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-lavender">REPLY TEXT</p>
                <h3 className="mt-1 text-[17px] font-black text-ink">DM文章</h3>
              </div>
              <button
                type="button"
                onClick={() => void copyText(message, "DM文章をコピーしました。")}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-lavender/10 px-3 text-[11px] font-black text-lavender transition hover:bg-lavender/15"
              >
                <Clipboard size={14} aria-hidden="true" />コピー
              </button>
            </div>
            <textarea
              readOnly
              value={message}
              aria-label="コメント返信用DM文章"
              className="mt-4 h-64 w-full resize-none rounded-xl border border-ink/10 bg-[#fcfaff] p-3 text-[11px] font-bold leading-5 text-ink/60 outline-none"
            />
            {character && (
              <button
                type="button"
                onClick={() => void copyText(scheduleUrl(selectedMonth, character.name), "スケジュールURLをコピーしました。")}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-pink/15 text-[11px] font-black text-pink transition hover:bg-pink/5"
              >
                <Link2 size={14} aria-hidden="true" />絞り込みURLだけコピー
              </button>
            )}
          </section>
        </aside>

        <section className="min-w-0 rounded-[24px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 border-b border-pink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">LIVE PREVIEW</p>
              <h3 className="mt-1 text-[19px] font-black text-ink">コメント返信画像</h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleDisplay()}
                disabled={isBusy || !canCreate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-pink/20 px-4 text-[11px] font-black text-pink transition hover:bg-pink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDisplaying ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <ExternalLink size={16} aria-hidden="true" />}
                {isDisplaying ? "準備中…" : "画像を表示"}
              </button>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isBusy || !canCreate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-4 text-[11px] font-black text-white shadow-[0_10px_22px_rgba(235,110,152,0.22)] transition hover:bg-[#df638e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDownloading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <ImageDown size={16} aria-hidden="true" />}
                {isDownloading ? "作成中…" : "PNG画像を保存"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] bg-[linear-gradient(135deg,#f5eef3_0%,#eee9f5_100%)] p-3 sm:p-5">
            <div ref={containerRef} className="mx-auto w-full max-w-[640px] overflow-hidden">
              <div style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}>
                <div style={{ width: CARD_WIDTH, height: CARD_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <div ref={(node) => { cardRef.current = node; }}>
                    <CharacterRecommendationCard month={selectedMonth} character={character} days={recommendations} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(scheduleState.status === "loading" || characterState.status === "loading") && (
            <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-ink/45">
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />最新データを読み込んでいます…
            </p>
          )}
          {scheduleState.status === "error" && (
            <p className="mt-3 text-[11px] font-bold text-[#b65364]">最新データを取得できなかったため、保存済みの予定で集計しています。</p>
          )}
          {operatingDayState.status === "error" && (
            <p className="mt-3 text-[11px] font-bold text-[#b65364]">休園日を取得できなかったため、集計結果を確認してください。</p>
          )}
          {feedback && (
            <p role="status" className="mt-3 rounded-xl bg-mint/10 px-3 py-2.5 text-[11px] font-black text-[#35745f]">{feedback}</p>
          )}
        </section>
      </div>
    </section>
  );
}
