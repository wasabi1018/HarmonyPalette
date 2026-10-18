"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ImageDown, LoaderCircle } from "lucide-react";
import { useInstagramSessionState, useInstagramUnsavedChanges } from "./instagram-session-provider";
import { CrowdForecastImage, FORECAST_IMAGE_HEIGHT, FORECAST_IMAGE_WIDTH } from "@/components/crowd-forecast/image";
import { formatForecastTime } from "@/components/crowd-forecast/weather";
import { forecastMonth } from "@/lib/crowd-forecast/presentation";
import type { PublicForecast } from "@/lib/crowd-forecast/types";

export function InstagramCrowdCalendarStudio() {
  useInstagramUnsavedChanges("crowd", false);
  const [forecast, setForecast] = useState<PublicForecast | null>(null);
  const [chosenMonth, setChosenMonth] = useInstagramSessionState("forecast-image.month", "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<{ url: string; month: string } | null>(null);
  const [scale, setScale] = useState(0.25);
  const preview = useRef<HTMLDivElement>(null);
  const capture = useRef<HTMLDivElement>(null);
  const month = forecast?.months.includes(chosenMonth) ? chosenMonth : forecast?.months[0] ?? "";
  const info = forecast && month ? forecastMonth(forecast, month) : null;
  const hasForecast = !!info?.dates.some((date) => {
    const day = info.byDate.get(date);
    return day && day.level !== "pending";
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/crowd-forecast", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("混雑予想を読み込めませんでした。");
        const data = await response.json() as PublicForecast;
        if (!Array.isArray(data.months) || !Array.isArray(data.days)) throw new Error("混雑予想を読み込めませんでした。");
        if (!controller.signal.aborted) setForecast(data);
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "読み込みに失敗しました。"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const element = preview.current;
    if (!element) return;
    const resize = () => setScale(Math.min(1, element.clientWidth / FORECAST_IMAGE_WIDTH));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [forecast]);
  useEffect(() => () => { if (generated) URL.revokeObjectURL(generated.url); }, [generated]);

  async function generate() {
    if (!capture.current || !hasForecast || busy) return;
    setBusy(true);
    setError("");
    try {
      await document.fonts.ready;
      const root = capture.current;
      await Promise.all(Array.from(root.querySelectorAll("img")).map((image) => image.decode()));
      const overflow = Array.from(root.querySelectorAll<HTMLElement>("[data-forecast-date]"))
        .filter((cell) => cell.scrollHeight > cell.clientHeight + 1 || cell.scrollWidth > cell.clientWidth + 1 ||
          Array.from(cell.querySelectorAll<HTMLElement>("[data-forecast-topic] > span")).some((label) => label.scrollWidth > label.clientWidth + 1))
        .map((cell) => cell.dataset.forecastDate);
      if (overflow.length || root.scrollHeight > FORECAST_IMAGE_HEIGHT + 1 || (root.querySelector("article")?.scrollHeight ?? 0) > FORECAST_IMAGE_HEIGHT + 1)
        throw new Error(`画像に表示内容が収まりません${overflow.length ? `（${overflow.join("、")}）` : ""}。混雑予想のトピックスをご確認ください。`);
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(root, { width: FORECAST_IMAGE_WIDTH, height: FORECAST_IMAGE_HEIGHT,
        pixelRatio: 1, backgroundColor: "#fffbfd", skipFonts: true });
      if (!blob) throw new Error("画像を生成できませんでした。");
      setGenerated({ url: URL.createObjectURL(blob), month });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "画像を生成できませんでした。");
    } finally { setBusy(false); }
  }

  return <section className="rounded-[26px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6" aria-label="混雑予想の画像生成">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-pink/10 pb-5">
      <div><h2 className="flex items-center gap-2 text-xl font-black"><CalendarDays size={22} aria-hidden="true" />混雑予想画像</h2>
        <p className="mt-2 text-xs leading-6 text-ink/60">公開中の混雑予想から投稿用の画像を生成します。</p>
      </div>
      <Link href="/admin/crowd-forecast" className="inline-flex min-h-11 items-center rounded-xl border border-pink/20 px-4 text-xs font-bold text-pink">混雑予想の設定</Link>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!forecast && !error && <p role="status" className="py-8 text-sm text-ink/60">混雑予想を読み込んでいます…</p>}
    {forecast && month && <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <label className="block text-xs font-bold">対象月
          <select value={month} disabled={busy} onChange={(event) => { setChosenMonth(event.target.value); setGenerated(null); setError(""); }} className="mt-2 min-h-11 w-full rounded-xl border border-pink/20 bg-white px-3 text-sm">
            {forecast.months.map((value) => <option key={value} value={value}>{value.slice(0, 4)}年{Number(value.slice(5, 7))}月</option>)}
          </select>
        </label>
        <p className="text-xs leading-6 text-ink/60">最終更新 {formatForecastTime(forecast.updatedAt)}<br />1080 × 1350px・PNG</p>
        <p className="text-xs leading-6 text-ink/60">混雑度・天気・トピックスは公開ページと共通です。予想の変更は「混雑予想の設定」で行えます。</p>
        {!hasForecast && <p role="status" className="text-xs leading-6 text-ink/60">この月の予想は準備中です。公開後に画像を生成できます。</p>}
        <button type="button" disabled={busy || !hasForecast} onClick={generate} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink px-4 text-sm font-bold text-white disabled:opacity-40">
          {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <ImageDown size={18} aria-hidden="true" />}{busy ? "画像を生成中…" : "画像を生成"}
        </button>
        {generated?.month === month && <div className="space-y-3">
          <p role="status" className="text-xs text-ink/70">画像を生成しました。</p>
          <a href={generated.url} download={`harmony-palette-crowd-forecast-${month}.png`} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-pink/30 px-4 text-sm font-bold text-pink">PNGを保存</a>
          <a href={generated.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center text-xs font-bold text-pink underline">生成した画像を開く</a>
        </div>}
        <Link href="/crowd-forecast" target="_blank" className="inline-flex min-h-11 items-center text-xs font-bold text-pink underline">公開ページを見る</Link>
      </div>
      <div ref={preview} className="min-w-0">
        <p className="mb-3 text-xs font-bold text-ink/60">画像プレビュー</p>
        <div className="overflow-hidden rounded-xl border border-pink/10 bg-[#fffbfd]" style={{ height: FORECAST_IMAGE_HEIGHT * scale }}>
          <div style={{ width: FORECAST_IMAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <div ref={capture} style={{ width: FORECAST_IMAGE_WIDTH, height: FORECAST_IMAGE_HEIGHT }}>
              <CrowdForecastImage forecast={forecast} month={month} />
            </div>
          </div>
        </div>
        {generated?.month === month && <div className="mt-5"><p className="mb-3 text-xs font-bold text-ink/60">生成したPNG</p>
          <Image src={generated.url} alt={`${month}の生成した混雑予想画像`} width={1080} height={1350} unoptimized className="h-auto w-full rounded-xl border border-pink/10" />
        </div>}
      </div>
    </div>}
  </section>;
}
