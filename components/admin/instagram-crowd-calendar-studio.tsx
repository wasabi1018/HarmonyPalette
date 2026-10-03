"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInstagramSessionState, useInstagramUnsavedChanges } from "./instagram-session-provider";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageDown,
  LoaderCircle,
  RotateCcw,
  Save,
} from "lucide-react";
import { toBlob } from "html-to-image";
import {
  buildCrowdCalendarMonth,
  crowdOverridesEqual,
  isCrowdMonth,
  normalizeCrowdOverrides,
  type CrowdCalendarMonth,
  type CrowdCalendarOverrides,
  type CrowdLevel,
} from "@/lib/crowd-calendar";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const CLOSED_BACKGROUND = "repeating-linear-gradient(135deg,#f0eef1 0px,#f0eef1 9px,#dfdae0 9px,#dfdae0 14px)";
const LEVELS = {
  veryBusy: { label: "大混雑", fill: "#F8D9DE", edge: "#D85F70" },
  busy: { label: "混雑", fill: "#FFF0C2", edge: "#BD852B" },
  normal: { label: "普通", fill: "#DDF1F9", edge: "#438EAF" },
  closed: { label: "休園日", fill: "#F0EEF1", edge: "#B7AFB7" },
} as const;

type CardLevel = keyof typeof LEVELS;
type DraftResponse = {
  draft?: { month?: string; overrides?: unknown; updatedAt?: string | null };
  closedDates?: string[];
  error?: string;
};

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function neighboringMonth(month: string, amount: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function readableDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function LevelSwatch({ level, size = 36 }: { level: CardLevel; size?: number }) {
  const item = LEVELS[level];
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        border: `2px solid ${item.edge}`,
        background: level === "closed" ? CLOSED_BACKGROUND : item.fill,
      }}
    />
  );
}

export function CrowdCalendarCard({
  calendar,
  createdOn,
}: {
  calendar: CrowdCalendarMonth;
  createdOn: string;
}) {
  const cellHeight = (753 - 134 - 18 - 4 * (calendar.weekCount - 1)) / calendar.weekCount;
  return (
    <article
      aria-label={`${calendar.year}年${calendar.month}月の混雑予想画像`}
      style={{
        position: "relative",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        overflow: "hidden",
        background: "#fffbfd",
        color: "#3e3540",
        fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
      }}
    >
      <span style={{ position: "absolute", right: -115, top: -160, width: 300, height: 410, borderRadius: "50%", background: "#fff0f5" }} />
      <span style={{ position: "absolute", left: -90, bottom: -95, width: 245, height: 245, borderRadius: "50%", background: "#f3effb" }} />

      <header style={{ position: "absolute", top: 54, left: 52, right: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 48 }}>
          <span style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "#eb6e98", color: "#fff", fontSize: 28, fontWeight: 900 }}>H</span>
          <span style={{ fontSize: 32, fontWeight: 900 }}>Harmony <span style={{ color: "#eb6e98" }}>Palette</span></span>
        </div>
        <p style={{ margin: "45px 0 0", color: "#eb6e98", fontSize: 19, fontWeight: 900, letterSpacing: 3 }}>MONTHLY CROWD FORECAST</p>
        <h2 style={{ margin: "14px 0 0", fontSize: 53, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.03em" }}>
          {calendar.year}年{calendar.month}月 混雑予想
        </h2>
        <p style={{ margin: "7px 0 0", color: "#766b74", fontSize: 22, fontWeight: 700 }}>日付ごとの混雑の目安を、ひと目で。</p>
      </header>

      <div style={{ position: "absolute", top: 307, left: 54, right: 54, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {(["veryBusy", "busy", "normal", "closed"] as const).map((level) => (
          <div key={level} style={{ display: "flex", alignItems: "center", gap: 12, height: 62, padding: "0 12px", border: "2px solid #f2dfe7", borderRadius: 21, background: "#fff", fontSize: 24, fontWeight: 900 }}>
            <LevelSwatch level={level} />
            <span>{LEVELS[level].label}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", top: 396, left: 50, width: 980, height: 753, overflow: "hidden", border: "2px solid #f5dde7", borderRadius: 30, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 77, padding: "0 28px" }}>
          <span style={{ fontSize: 36, fontWeight: 900 }}>{calendar.year} / {String(calendar.month).padStart(2, "0")}</span>
          <span style={{ color: "#887b85", fontSize: 18, fontWeight: 800 }}>混雑予想カレンダー</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", alignItems: "center", height: 57, borderTop: "2px solid #f6e7ed", borderBottom: "2px solid #f6e7ed", background: "#fff7fa" }}>
          {WEEKDAYS.map((weekday, index) => (
            <span key={weekday} style={{ textAlign: "center", color: index === 0 ? "#d85f84" : index === 6 ? "#438eaf" : "#6b6069", fontSize: 22, fontWeight: 900 }}>{weekday}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gridTemplateRows: `repeat(${calendar.weekCount},${cellHeight}px)`, gap: 4, padding: "4px" }}>
          {calendar.cells.map((cell) => {
            const level = cell.level;
            const item = level ? LEVELS[level] : null;
            return (
              <div
                key={cell.date}
                style={{
                  position: "relative",
                  minWidth: 0,
                  border: item ? `2px solid ${item.edge}44` : "none",
                  borderRadius: 11,
                  background: level === "closed" ? CLOSED_BACKGROUND : item?.fill ?? "#f8f6f8",
                }}
              >
                <span style={{ position: "absolute", top: 12, left: 14, color: !cell.inMonth ? "#cfc5cd" : level === "closed" ? "#817881" : "#3e3540", fontSize: calendar.weekCount === 6 ? 34 : 38, fontWeight: 900, lineHeight: 1.25 }}>
                  {cell.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <footer style={{ position: "absolute", left: 54, right: 54, bottom: 34, color: "#695d67" }}>
        <p style={{ margin: "0 0 7px", fontSize: 21, fontWeight: 800 }}>画像作成日 {createdOn.replaceAll("-", "/")}</p>
        <p style={{ margin: "0 0 19px", fontSize: 20, fontWeight: 700 }}>※ 混雑予想は目安です。最新の営業情報もご確認ください。</p>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #f3dfe8", paddingTop: 15, color: "#d65f88", fontSize: 25, fontWeight: 900 }}>
          <span>Harmony Palette</span>
          <span style={{ color: "#9a8792", fontSize: 18, letterSpacing: 2 }}>CROWD CALENDAR</span>
        </div>
      </footer>
    </article>
  );
}

async function responseData(response: Response): Promise<DraftResponse> {
  const data = await response.json() as DraftResponse;
  if (!response.ok || !data.draft) throw new Error(data.error || "下書きを読み込めませんでした。");
  return data;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function InstagramCrowdCalendarStudio() {
  const [month, setMonth] = useInstagramSessionState("crowd.month", () => todayInJapan().slice(0, 7));
  const [brush, setBrush] = useInstagramSessionState<CrowdLevel>("crowd.brush", "normal");
  const [overrides, setOverrides] = useInstagramSessionState<CrowdCalendarOverrides>("crowd.overrides", {});
  const [savedOverrides, setSavedOverrides] = useInstagramSessionState<CrowdCalendarOverrides>("crowd.saved-overrides", {});
  const [savedAt, setSavedAt] = useInstagramSessionState<string | null>("crowd.saved-at", null);
  const [loadedMonth, setLoadedMonth] = useInstagramSessionState("crowd.loaded-month", "");
  const loadedMonthRef = useRef(loadedMonth);
  const [closedDates, setClosedDates] = useState<ReadonlySet<string>>(() => new Set());
  const [history, setHistory] = useInstagramSessionState<CrowdCalendarOverrides[]>("crowd.history", []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState(false);
  const [reloadRevision, setReloadRevision] = useState(0);
  const [scale, setScale] = useState(0.5);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const dirty = !crowdOverridesEqual(overrides, savedOverrides);
  useInstagramUnsavedChanges("crowd", dirty);

  const calendar = useMemo(
    () => buildCrowdCalendarMonth(month, overrides, closedDates),
    [month, overrides, closedDates],
  );
  const counts = useMemo(() => {
    const result = { veryBusy: 0, busy: 0, normal: 0, closed: 0 };
    calendar?.cells.forEach((cell) => {
      if (cell.level) result[cell.level] += 1;
    });
    return result;
  }, [calendar]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setFeedback("");
    fetch(`/api/admin/instagram-crowd-calendar?month=${month}`, { cache: "no-store", signal: controller.signal })
      .then(responseData)
      .then(({ draft, closedDates: loadedClosedDates }) => {
        if (!draft || controller.signal.aborted) return;
        if (!Array.isArray(loadedClosedDates)) throw new Error("休園日を取得できませんでした。");
        const loaded = normalizeCrowdOverrides(month, draft.overrides);
        setClosedDates(new Set(loadedClosedDates));
        if (loadedMonthRef.current !== month) {
          setOverrides(loaded);
          setSavedOverrides(loaded);
          setSavedAt(draft.updatedAt ?? null);
          setHistory([]);
        }
        loadedMonthRef.current = month;
        setLoadedMonth(month);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "下書きを読み込めませんでした。");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, reloadRevision, setHistory, setLoadedMonth, setOverrides, setSavedAt, setSavedOverrides]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const update = () => setScale(Math.min(1, container.clientWidth / CARD_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadedMonthRef.current = loadedMonth;
  }, [loadedMonth]);

  const changeMonth = (next: string) => {
    if (!isCrowdMonth(next) || next === month || saving) return;
    if (dirty && !window.confirm("未保存の変更があります。月を切り替えますか？")) return;
    setBrush("normal");
    setOverrides({});
    setSavedOverrides({});
    setSavedAt(null);
    setClosedDates(new Set());
    setHistory([]);
    setMonth(next);
  };

  const paint = (date: string) => {
    if (loading || saving || loadError || closedDates.has(date)) return;
    const next = { ...overrides };
    if (brush === "normal") delete next[date];
    else next[date] = brush;
    if (crowdOverridesEqual(next, overrides)) return;
    setHistory((current) => [...current.slice(-19), overrides]);
    setOverrides(next);
    setFeedback("");
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setOverrides(previous);
    setHistory((current) => current.slice(0, -1));
  };

  const resetToNormal = () => {
    if (Object.keys(overrides).length === 0) return;
    setHistory((current) => [...current.slice(-19), overrides]);
    setOverrides({});
  };

  const saveDraft = async () => {
    if (loading || saving || loadError) return;
    setSaving(true);
    setFeedback("");
    try {
      const { draft } = await responseData(await fetch("/api/admin/instagram-crowd-calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, overrides }),
      }));
      const saved = normalizeCrowdOverrides(month, draft?.overrides);
      setOverrides(saved);
      setSavedOverrides(saved);
      setSavedAt(draft?.updatedAt ?? null);
      setHistory([]);
      setFeedbackError(false);
      setFeedback("この月の下書きを保存しました。");
    } catch (error) {
      setFeedbackError(true);
      setFeedback(error instanceof Error ? error.message : "下書きを保存できませんでした。");
    } finally {
      setSaving(false);
    }
  };

  const capture = async () => {
    if (!captureRef.current) throw new Error("画像の準備ができていません。");
    const blob = await toBlob(captureRef.current, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      pixelRatio: 1,
      backgroundColor: "#fffbfd",
      skipFonts: true,
    });
    if (!blob) throw new Error("画像を作成できませんでした。");
    return blob;
  };

  const downloadImage = async () => {
    if (imageBusy || loading || loadError) return;
    setImageBusy(true);
    setFeedback("");
    try {
      const blob = await capture();
      downloadBlob(blob, `harmony-palette-crowd-calendar-${month}.png`);
      setFeedbackError(false);
      setFeedback(dirty ? "PNGを保存しました。下書きの変更は未保存です。" : "PNGを保存しました。");
    } catch (error) {
      setFeedbackError(true);
      setFeedback(error instanceof Error ? error.message : "PNGを保存できませんでした。");
    } finally {
      setImageBusy(false);
    }
  };

  const displayImage = async () => {
    if (imageBusy || loading || loadError) return;
    const imageWindow = window.open("", "_blank");
    if (!imageWindow) {
      setFeedbackError(true);
      setFeedback("画像を開けませんでした。ポップアップの設定を確認してください。");
      return;
    }
    setImageBusy(true);
    try {
      const blob = await capture();
      const url = URL.createObjectURL(blob);
      const image = imageWindow.document.createElement("img");
      image.src = url;
      image.alt = `${month}の混雑予想カレンダー`;
      image.style.display = "block";
      image.style.width = "100%";
      image.style.maxWidth = `${CARD_WIDTH}px`;
      image.style.margin = "0 auto";
      imageWindow.document.title = `${month} 混雑予想カレンダー`;
      imageWindow.document.body.style.margin = "0";
      imageWindow.document.body.style.background = "#f5f0f4";
      imageWindow.document.body.replaceChildren(image);
      imageWindow.addEventListener("pagehide", () => URL.revokeObjectURL(url), { once: true });
      imageWindow.focus();
      setFeedbackError(false);
      setFeedback("画像を別タブで表示しました。スマートフォンでは長押しして保存できます。");
    } catch (error) {
      imageWindow.document.body.textContent = error instanceof Error ? error.message : "画像を表示できませんでした。";
      setFeedbackError(true);
      setFeedback("画像を表示できませんでした。");
    } finally {
      setImageBusy(false);
    }
  };

  const canCreateImage = !loading && !loadError && !imageBusy;
  const createdOn = todayInJapan();

  return (
    <section id="crowd-calendar-studio" className="mb-7 rounded-[26px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
      <div className="mb-6 flex items-start gap-3 border-b border-pink/10 pb-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink"><CalendarDays size={23} aria-hidden="true" /></span>
        <div>
          <p className="text-[10px] font-black tracking-[0.16em] text-pink">CROWD CALENDAR</p>
          <h2 className="mt-1 text-[21px] font-black text-ink sm:text-[25px]">混雑予想カレンダー</h2>
          <p className="mt-1 text-[12px] font-bold leading-6 text-ink/55">普通を初期値にして、混雑する日だけ選びます。休園日は営業情報から反映します。</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 rounded-[22px] border border-pink/10 bg-[#fffafd] p-4 sm:p-5">
          <label htmlFor="crowd-calendar-month" className="text-[12px] font-black text-ink">対象月</label>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => changeMonth(neighboringMonth(month, -1))} disabled={loading || saving || !isCrowdMonth(neighboringMonth(month, -1))} aria-label="前の月" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-pink/15 bg-white text-pink disabled:opacity-40"><ChevronLeft size={18} aria-hidden="true" /></button>
            <input id="crowd-calendar-month" type="month" value={month} min="2000-01" max="2100-12" onChange={(event) => changeMonth(event.target.value)} disabled={loading || saving} className="min-h-11 min-w-0 flex-1 rounded-xl border border-pink/15 bg-white px-3 text-[13px] font-bold text-ink" />
            <button type="button" onClick={() => changeMonth(neighboringMonth(month, 1))} disabled={loading || saving || !isCrowdMonth(neighboringMonth(month, 1))} aria-label="次の月" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-pink/15 bg-white text-pink disabled:opacity-40"><ChevronRight size={18} aria-hidden="true" /></button>
          </div>

          <p className="mt-5 text-[12px] font-black text-ink">設定する混雑区分</p>
          <div className="mt-2 grid grid-cols-3 gap-2" aria-label="設定する混雑区分">
            {(["veryBusy", "busy", "normal"] as const).map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={brush === level}
                onClick={() => setBrush(level)}
                disabled={loading || saving || Boolean(loadError)}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-1 text-[11px] font-black transition sm:text-[12px] ${brush === level ? "border-pink bg-white text-ink shadow-sm" : "border-pink/10 bg-white/70 text-ink/65"} disabled:opacity-50`}
              >
                <LevelSwatch level={level} size={19} />{LEVELS[level].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-bold text-ink/45">区分を選んで日付を押すと、同じ区分を続けて設定できます。</p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-pink/15 bg-white">
            <div className="grid grid-cols-7 border-b border-pink/10 bg-[#fff7fa] py-2">
              {WEEKDAYS.map((day, index) => <span key={day} className={`text-center text-[11px] font-black ${index === 0 ? "text-pink" : index === 6 ? "text-sky" : "text-ink/55"}`}>{day}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 p-1">
              {calendar?.cells.map((cell) => {
                const item = cell.level ? LEVELS[cell.level] : null;
                const style = { background: cell.level === "closed" ? CLOSED_BACKGROUND : item?.fill ?? "#f8f6f8", borderColor: item ? `${item.edge}55` : "transparent" };
                if (!cell.inMonth || cell.level === "closed") {
                  return <span key={cell.date} role="img" aria-label={`${readableDate(cell.date)}、${cell.level === "closed" ? "休園日" : "対象月外"}`} style={style} className={`flex h-14 items-start rounded-lg border p-1.5 text-[13px] font-black sm:h-[72px] ${cell.level === "closed" ? "text-ink/60" : "text-ink/20"}`}>{cell.day}</span>;
                }
                const activeLevel = cell.level ?? "normal";
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => paint(cell.date)}
                    disabled={loading || saving || Boolean(loadError)}
                    aria-label={`${readableDate(cell.date)}、${LEVELS[activeLevel].label}。${LEVELS[brush].label}に変更`}
                    style={style}
                    className="flex h-14 items-start rounded-lg border p-1.5 text-left text-[13px] font-black text-ink transition hover:brightness-[0.97] disabled:cursor-not-allowed sm:h-[72px]"
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black text-ink/55">
            <span>大混雑 {counts.veryBusy}日</span><span>混雑 {counts.busy}日</span><span>普通 {counts.normal}日</span><span>休園日 {counts.closed}日</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={undo} disabled={history.length === 0 || loading || saving} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-pink/15 bg-white px-3 text-[11px] font-black text-ink/60 disabled:opacity-40"><RotateCcw size={14} aria-hidden="true" />元に戻す</button>
            <button type="button" onClick={resetToNormal} disabled={Object.keys(overrides).length === 0 || loading || saving} className="min-h-10 rounded-xl border border-pink/15 bg-white px-3 text-[11px] font-black text-ink/60 disabled:opacity-40">すべて普通に戻す</button>
            <button type="button" onClick={() => void saveDraft()} disabled={loading || saving || Boolean(loadError) || (!dirty && Boolean(savedAt))} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-pink px-4 text-[11px] font-black text-white disabled:opacity-40">
              {saving ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}下書き保存
            </button>
          </div>
          <p className="mt-3 text-[10px] font-bold text-ink/45">{dirty ? "未保存の変更があります。" : savedAt ? `保存済み：${new Date(savedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}` : "この月の下書きはまだ保存していません。"}</p>
          {loadError && <div className="mt-3 rounded-xl bg-[#fff0f2] p-3 text-[11px] font-bold text-[#a34859]">{loadError}<button type="button" onClick={() => setReloadRevision((value) => value + 1)} className="ml-2 underline">再読み込み</button></div>}
          {feedback && <p role="status" className={`mt-3 rounded-xl p-3 text-[11px] font-bold ${feedbackError ? "bg-[#fff0f2] text-[#a34859]" : "bg-mint/10 text-[#35745f]"}`}>{feedback}</p>}
        </div>

        <div className="min-w-0 rounded-[22px] border border-pink/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">LIVE PREVIEW</p>
              <h3 className="mt-1 text-[17px] font-black text-ink">Instagram投稿プレビュー</h3>
              <p className="text-[10px] font-bold text-ink/45">1080 × 1350px・フィード投稿向け</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void displayImage()} disabled={!canCreateImage} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-pink/20 bg-white px-3 text-[11px] font-black text-pink disabled:opacity-40"><ExternalLink size={15} aria-hidden="true" />画像を表示</button>
              <button type="button" onClick={() => void downloadImage()} disabled={!canCreateImage} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-pink px-3 text-[11px] font-black text-white disabled:opacity-40">{imageBusy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <ImageDown size={15} aria-hidden="true" />}PNG画像を保存</button>
            </div>
          </div>
          <div className="mt-5 rounded-[20px] bg-[linear-gradient(135deg,#f5eef3_0%,#eee9f5_100%)] p-2 sm:p-4">
            <div ref={previewContainerRef} className="mx-auto w-full max-w-[640px] overflow-hidden">
              <div style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}>
                <div style={{ width: CARD_WIDTH, height: CARD_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  {calendar && <CrowdCalendarCard calendar={calendar} createdOn={createdOn} />}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-ink/45">カレンダー内は日付と背景色のみ表示します。月外の日は薄灰です。</p>
        </div>
      </div>

      <div aria-hidden="true" style={{ position: "fixed", top: 0, left: -20000, pointerEvents: "none" }}>
        <div ref={captureRef} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>{calendar && <CrowdCalendarCard calendar={calendar} createdOn={createdOn} />}</div>
      </div>
    </section>
  );
}
