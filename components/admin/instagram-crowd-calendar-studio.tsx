"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInstagramSessionState, useInstagramUnsavedChanges } from "./instagram-session-provider";
import {
  CalendarDays,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageDown,
  LoaderCircle,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { toBlob } from "html-to-image";
import {
  buildCrowdCalendarMonth,
  crowdOverridesEqual,
  isCrowdMonth,
  normalizeCrowdOverrides,
  normalizeCrowdAnnotations,
  normalizeCrowdSettings,
  validateCrowdAnnotations,
  validateCrowdSettings,
  crowdCalendarDetails,
  emptyCrowdSettings,
  CROWD_NOTE_MAX_LENGTH,
  CROWD_LABEL_MAX_LENGTH,
  CROWD_EVENT_NAME_MAX_LENGTH,
  CROWD_EVENT_MAX_COUNT,
  type CrowdCalendarAnnotations,
  type CrowdCalendarAnnotation,
  type CrowdCalendarSettings,
  type CrowdCalendarLabels,
  type CrowdCalendarFacts,
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
const LABEL_FIELDS: Array<{ key: keyof CrowdCalendarLabels; label: string }> = [
  { key: "fanStudio", label: "ファンスタ3部屋" }, { key: "night", label: "ナイト営業" },
  { key: "birthday", label: "誕生日の後ろに付ける文言" }, { key: "eventStart", label: "イベント開始の文言" },
  { key: "eventEnd", label: "イベント終了の文言" },
];
const FIELD_CLASS = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-pink/15 bg-white px-3 py-2 text-[12px] font-bold text-ink";

type CardLevel = keyof typeof LEVELS;
type DraftResponse = {
  draft?: { month?: string; overrides?: unknown; annotations?: unknown; updatedAt?: string | null };
  settings?: CrowdCalendarSettings & { updatedAt?: string | null };
  facts?: CrowdCalendarFacts;
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
  settings = emptyCrowdSettings(),
  annotations = {},
  facts = {},
}: {
  calendar: CrowdCalendarMonth;
  createdOn: string;
  settings?: CrowdCalendarSettings;
  annotations?: CrowdCalendarAnnotations;
  facts?: CrowdCalendarFacts;
}) {
  const cellHeight = (952 - 91 - 12 - 4 * (calendar.weekCount - 1)) / calendar.weekCount;
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

      <header style={{ position: "absolute", top: 40, left: 52, right: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 48 }}>
          <span style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "#eb6e98", color: "#fff", fontSize: 28, fontWeight: 900 }}>H</span>
          <span style={{ fontSize: 32, fontWeight: 900 }}>Harmony <span style={{ color: "#eb6e98" }}>Palette</span></span>
        </div>
        <h2 style={{ margin: "19px 0 0", fontSize: 49, fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.03em" }}>
          {calendar.year}年{calendar.month}月 混雑予想
        </h2>
        <p style={{ margin: "6px 0 0", color: "#766b74", fontSize: 19, fontWeight: 700 }}>混雑の目安と、その日のトピックス。</p>
      </header>

      <div style={{ position: "absolute", top: 208, left: 54, right: 54, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {(["veryBusy", "busy", "normal", "closed"] as const).map((level) => (
          <div key={level} style={{ display: "flex", alignItems: "center", gap: 12, height: 44, padding: "0 12px", border: "2px solid #f2dfe7", borderRadius: 15, background: "#fff", fontSize: 22, fontWeight: 900 }}>
            <LevelSwatch level={level} size={28} />
            <span>{LEVELS[level].label}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", top: 272, left: 50, width: 980, height: 952, overflow: "hidden", border: "2px solid #f5dde7", borderRadius: 25, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 49, padding: "0 22px" }}>
          <span style={{ fontSize: 28, fontWeight: 900 }}>{calendar.year} / {String(calendar.month).padStart(2, "0")}</span>
          <span style={{ color: "#887b85", fontSize: 18, fontWeight: 800 }}>混雑予想カレンダー</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", alignItems: "center", height: 42, borderTop: "2px solid #f6e7ed", borderBottom: "2px solid #f6e7ed", background: "#fff7fa" }}>
          {WEEKDAYS.map((weekday, index) => (
            <span key={weekday} style={{ textAlign: "center", color: index === 0 ? "#d85f84" : index === 6 ? "#438eaf" : "#6b6069", fontSize: 22, fontWeight: 900 }}>{weekday}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gridTemplateRows: `repeat(${calendar.weekCount},${cellHeight}px)`, gap: 4, padding: "4px" }}>
          {calendar.cells.map((cell) => {
            const level = cell.level;
            const item = level ? LEVELS[level] : null;
            const details = cell.inMonth ? crowdCalendarDetails(cell.date, level === "closed", settings, annotations, facts) : [];
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
                <span style={{ position: "absolute", top: 6, left: 9, color: !cell.inMonth ? "#cfc5cd" : level === "closed" ? "#817881" : "#3e3540", fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
                  {cell.day}
                </span>
                {details.length > 0 && <div data-crowd-details={cell.date} style={{ position: "absolute", top: 39, bottom: 6, left: 8, right: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {details.map((detail) => <div key={detail.key} style={{ display: "flex", alignItems: "flex-start", gap: 3, color: detail.kind === "event" || detail.kind === "birthday" ? "#99465e" : detail.kind === "fanStudio" ? "#654e89" : "#3e3540", fontSize: 15, fontWeight: 800, lineHeight: "18px", letterSpacing: "-0.025em" }}>
                      {detail.kind === "birthday" && <CakeSlice size={13} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />}
                      {detail.kind === "night" && <Moon size={13} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />}
                      <span style={{ minWidth: 0, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{detail.text}</span>
                    </div>)}
                  </div>
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      <footer style={{ position: "absolute", left: 54, right: 54, bottom: 23, color: "#695d67", lineHeight: 1.3 }}>
        <p style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>画像作成日 {createdOn.replaceAll("-", "/")}</p>
        <p style={{ margin: "0 0 9px", fontSize: 17, fontWeight: 700 }}>※ 混雑予想は目安です。最新の営業情報もご確認ください。</p>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #f3dfe8", paddingTop: 8, color: "#d65f88", fontSize: 21, fontWeight: 900 }}>
          <span>Harmony Palette</span>
          <span style={{ color: "#9a8792", fontSize: 18, letterSpacing: 2 }}>CROWD CALENDAR</span>
        </div>
      </footer>
    </article>
  );
}

export function crowdCalendarOverflowDates(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-crowd-details]"))
    .filter((element) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)
    .map((element) => element.dataset.crowdDetails ?? "");
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
  const [annotations, setAnnotations] = useInstagramSessionState<CrowdCalendarAnnotations>("crowd.annotations", {});
  const [savedAnnotations, setSavedAnnotations] = useInstagramSessionState<CrowdCalendarAnnotations>("crowd.saved-annotations", {});
  const [settings, setSettings] = useInstagramSessionState<CrowdCalendarSettings>("crowd.settings", emptyCrowdSettings);
  const [savedSettings, setSavedSettings] = useInstagramSessionState<CrowdCalendarSettings>("crowd.saved-settings", emptyCrowdSettings);
  const [settingsAt, setSettingsAt] = useInstagramSessionState<string | null>("crowd.settings-at", null);
  const [settingsLoaded, setSettingsLoaded] = useInstagramSessionState("crowd.settings-loaded", false);
  const settingsLoadedRef = useRef(settingsLoaded);
  const [mode, setMode] = useInstagramSessionState<"paint" | "details">("crowd.mode", "paint");
  const [selectedDate, setSelectedDate] = useInstagramSessionState("crowd.selected-date", "");
  const [savedAt, setSavedAt] = useInstagramSessionState<string | null>("crowd.saved-at", null);
  const [loadedMonth, setLoadedMonth] = useInstagramSessionState("crowd.loaded-month", "");
  const loadedMonthRef = useRef(loadedMonth);
  const [closedDates, setClosedDates] = useState<ReadonlySet<string>>(() => new Set());
  const [facts, setFacts] = useState<CrowdCalendarFacts>({});
  const [history, setHistory] = useInstagramSessionState<Array<{ overrides: CrowdCalendarOverrides; annotations: CrowdCalendarAnnotations }>>("crowd.detail-history", []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState(false);
  const [reloadRevision, setReloadRevision] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [overflowDates, setOverflowDates] = useState<string[]>([]);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const dirty = !crowdOverridesEqual(overrides, savedOverrides) || JSON.stringify(annotations) !== JSON.stringify(savedAnnotations);
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  useInstagramUnsavedChanges("crowd", dirty || settingsDirty);

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
      .then(({ draft, settings: loadedSettings, facts: loadedFacts, closedDates: loadedClosedDates }) => {
        if (!draft || controller.signal.aborted) return;
        if (!Array.isArray(loadedClosedDates)) throw new Error("休園日を取得できませんでした。");
        if (!loadedSettings || !loadedFacts) throw new Error("日付の表示情報を取得できませんでした。");
        const loaded = normalizeCrowdOverrides(month, draft.overrides);
        const loadedAnnotations = normalizeCrowdAnnotations(month, draft.annotations);
        setClosedDates(new Set(loadedClosedDates));
        setFacts(loadedFacts);
        if (loadedMonthRef.current !== month) {
          setOverrides(loaded);
          setSavedOverrides(loaded);
          setAnnotations(loadedAnnotations);
          setSavedAnnotations(loadedAnnotations);
          setSavedAt(draft.updatedAt ?? null);
          setHistory([]);
        }
        if (!settingsLoadedRef.current) {
          const normalized = normalizeCrowdSettings(loadedSettings);
          setSettings(normalized);
          setSavedSettings(normalized);
          setSettingsAt(loadedSettings.updatedAt ?? null);
          settingsLoadedRef.current = true;
          setSettingsLoaded(true);
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
  }, [month, reloadRevision, setHistory, setLoadedMonth, setOverrides, setSavedAt, setSavedOverrides, setAnnotations, setSavedAnnotations, setSettings, setSavedSettings, setSettingsAt, setSettingsLoaded]);

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

  useEffect(() => {
    let active = true;
    const check = () => {
      if (!active || !captureRef.current) return;
      setOverflowDates(crowdCalendarOverflowDates(captureRef.current));
    };
    check();
    void document.fonts.ready.then(check);
    return () => { active = false; };
  }, [calendar, annotations, settings, facts]);

  const changeMonth = (next: string) => {
    if (!isCrowdMonth(next) || next === month || saving) return;
    if (dirty && !window.confirm("未保存の変更があります。月を切り替えますか？")) return;
    setBrush("normal");
    setOverrides({});
    setSavedOverrides({});
    setAnnotations({});
    setSavedAnnotations({});
    setSelectedDate("");
    setSavedAt(null);
    setClosedDates(new Set());
    setFacts({});
    setHistory([]);
    loadedMonthRef.current = "";
    setLoadedMonth("");
    setLoading(true);
    setMonth(next);
  };

  const paint = (date: string) => {
    if (loading || saving || loadError || closedDates.has(date)) return;
    const next = { ...overrides };
    if (brush === "normal") delete next[date];
    else next[date] = brush;
    if (crowdOverridesEqual(next, overrides)) return;
    setHistory((current) => [...current.slice(-19), { overrides, annotations }]);
    setOverrides(next);
    setFeedback("");
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setOverrides(previous.overrides);
    setAnnotations(previous.annotations);
    setHistory((current) => current.slice(0, -1));
  };

  const resetToNormal = () => {
    if (Object.keys(overrides).length === 0) return;
    setHistory((current) => [...current.slice(-19), { overrides, annotations }]);
    setOverrides({});
  };

  const saveDraft = async () => {
    if (loading || saving || loadError) return;
    setSaving(true);
    setFeedback("");
    try {
      const validAnnotations = validateCrowdAnnotations(month, annotations);
      const { draft } = await responseData(await fetch("/api/admin/instagram-crowd-calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, overrides, annotations: validAnnotations }),
      }));
      const saved = normalizeCrowdOverrides(month, draft?.overrides);
      setOverrides(saved);
      setSavedOverrides(saved);
      const savedDetails = normalizeCrowdAnnotations(month, draft?.annotations);
      setAnnotations(savedDetails);
      setSavedAnnotations(savedDetails);
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

  const updateAnnotation = (change: Partial<CrowdCalendarAnnotation>) => {
    if (!selectedDate || loading || saving || loadError) return;
    setHistory((current) => [...current.slice(-19), { overrides, annotations }]);
    const next = { ...annotations, [selectedDate]: { ...annotations[selectedDate], ...change } };
    setAnnotations(next);
    setFeedback("");
  };

  const saveSettings = async () => {
    if (loading || saving || loadError) return;
    setSaving(true);
    setFeedback("");
    try {
      const valid = validateCrowdSettings(settings);
      const response = await fetch("/api/admin/instagram-crowd-calendar/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid),
      });
      const data = await response.json() as DraftResponse;
      if (!response.ok || !data.settings) throw new Error(data.error || "共通設定を保存できませんでした。");
      const saved = normalizeCrowdSettings(data.settings);
      setSettings(saved);
      setSavedSettings(saved);
      setSettingsAt(data.settings.updatedAt ?? null);
      setFeedbackError(false);
      setFeedback("全月共通のイベント・表示文言を保存しました。");
    } catch (error) {
      setFeedbackError(true);
      setFeedback(error instanceof Error ? error.message : "共通設定を保存できませんでした。");
    } finally { setSaving(false); }
  };

  const capture = async () => {
    if (!captureRef.current) throw new Error("画像の準備ができていません。");
    validateCrowdSettings(settings);
    validateCrowdAnnotations(month, annotations);
    await document.fonts.ready;
    const overflow = crowdCalendarOverflowDates(captureRef.current);
    if (overflow.length) throw new Error(`${overflow.map((date) => `${Number(date.slice(-2))}日`).join("・")}の文字がマスに収まりません。文言を短くしてください。`);
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

  const canCreateImage = !loading && !saving && !loadError && !imageBusy && overflowDates.length === 0;
  const editingDisabled = loading || saving || imageBusy || Boolean(loadError);
  const selectedFacts = facts[selectedDate];
  const selectedAnnotation = annotations[selectedDate];
  const createdOn = todayInJapan();

  return (
    <section id="crowd-calendar-studio" className="mb-7 rounded-[26px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
      <div className="mb-6 flex items-start gap-3 border-b border-pink/10 pb-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink"><CalendarDays size={23} aria-hidden="true" /></span>
        <div>
          <p className="text-[10px] font-black tracking-[0.16em] text-pink">CROWD CALENDAR</p>
          <h2 className="mt-1 text-[21px] font-black text-ink sm:text-[25px]">混雑予想カレンダー</h2>
          <p className="mt-1 text-[12px] font-bold leading-6 text-ink/55">混雑度と日付ごとのトピックスを設定します。休園日・ナイト営業・誕生日は登録済み情報から反映します。</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 rounded-[22px] border border-pink/10 bg-[#fffafd] p-4 sm:p-5">
          <label htmlFor="crowd-calendar-month" className="text-[12px] font-black text-ink">対象月</label>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => changeMonth(neighboringMonth(month, -1))} disabled={editingDisabled || !isCrowdMonth(neighboringMonth(month, -1))} aria-label="前の月" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-pink/15 bg-white text-pink disabled:opacity-40"><ChevronLeft size={18} aria-hidden="true" /></button>
            <input id="crowd-calendar-month" type="month" value={month} min="2000-01" max="2100-12" onChange={(event) => changeMonth(event.target.value)} disabled={editingDisabled} className="min-h-11 min-w-0 flex-1 rounded-xl border border-pink/15 bg-white px-3 text-[13px] font-bold text-ink" />
            <button type="button" onClick={() => changeMonth(neighboringMonth(month, 1))} disabled={editingDisabled || !isCrowdMonth(neighboringMonth(month, 1))} aria-label="次の月" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-pink/15 bg-white text-pink disabled:opacity-40"><ChevronRight size={18} aria-hidden="true" /></button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2" aria-label="カレンダーの編集方法">
            {([ ["paint", "混雑度を設定"], ["details", "日付の情報を編集"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} disabled={editingDisabled} onClick={() => setMode(value)} className={`min-h-11 rounded-xl border px-2 text-[11px] font-black ${mode === value ? "border-pink bg-white text-pink" : "border-pink/10 text-ink/60"} disabled:opacity-40`}>{label}</button>)}
          </div>
          {mode === "paint" && <>
          <p className="mt-5 text-[12px] font-black text-ink">設定する混雑区分</p>
          <div className="mt-2 grid grid-cols-3 gap-2" aria-label="設定する混雑区分">
            {(["veryBusy", "busy", "normal"] as const).map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={brush === level}
                onClick={() => setBrush(level)}
                disabled={editingDisabled}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-1 text-[11px] font-black transition sm:text-[12px] ${brush === level ? "border-pink bg-white text-ink shadow-sm" : "border-pink/10 bg-white/70 text-ink/65"} disabled:opacity-50`}
              >
                <LevelSwatch level={level} size={19} />{LEVELS[level].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-bold text-ink/45">区分を選んで日付を押すと、同じ区分を続けて設定できます。</p>
          </>}
          {mode === "details" && <p className="mt-3 text-[11px] font-bold text-ink/55">日付を選ぶと、下に表示情報の編集欄が開きます。</p>}

          <div className="mt-5 overflow-hidden rounded-2xl border border-pink/15 bg-white">
            <div className="grid grid-cols-7 border-b border-pink/10 bg-[#fff7fa] py-2">
              {WEEKDAYS.map((day, index) => <span key={day} className={`text-center text-[11px] font-black ${index === 0 ? "text-pink" : index === 6 ? "text-sky" : "text-ink/55"}`}>{day}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 p-1">
              {calendar?.cells.map((cell) => {
                const item = cell.level ? LEVELS[cell.level] : null;
                const style = { background: cell.level === "closed" ? CLOSED_BACKGROUND : item?.fill ?? "#f8f6f8", borderColor: item ? `${item.edge}55` : "transparent" };
                if (!cell.inMonth || (cell.level === "closed" && mode === "paint")) {
                  return <span key={cell.date} role="img" aria-label={`${readableDate(cell.date)}、${cell.level === "closed" ? "休園日" : "対象月外"}`} style={style} className={`flex h-14 items-start rounded-lg border p-1.5 text-[13px] font-black sm:h-[72px] ${cell.level === "closed" ? "text-ink/60" : "text-ink/20"}`}>{cell.day}</span>;
                }
                const activeLevel = cell.level ?? "normal";
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => mode === "details" ? setSelectedDate(cell.date) : paint(cell.date)}
                    disabled={editingDisabled}
                    aria-pressed={mode === "details" ? selectedDate === cell.date : undefined}
                    aria-label={`${readableDate(cell.date)}、${LEVELS[activeLevel].label}。${mode === "details" ? "表示情報を編集" : `${LEVELS[brush].label}に変更`}`}
                    style={style}
                    className={`flex h-14 flex-col items-start rounded-lg border p-1.5 text-left text-[13px] font-black text-ink transition hover:brightness-[0.97] disabled:cursor-not-allowed sm:h-[72px] ${mode === "details" && selectedDate === cell.date ? "ring-2 ring-pink ring-inset" : ""}`}
                  >
                    {cell.day}
                    {crowdCalendarDetails(cell.date, cell.level === "closed", settings, annotations, facts).length > 0 && <span className="mt-auto text-[9px] font-bold text-ink/55">情報あり</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === "details" && selectedDate.startsWith(`${month}-`) && <fieldset disabled={editingDisabled} className="mt-4 min-w-0 rounded-2xl border border-pink/15 bg-white p-4">
            <legend className="px-1 text-[13px] font-black text-pink">{readableDate(selectedDate)}の表示情報</legend>
            <label className="block text-[11px] font-black text-ink">{settings.labels.fanStudio}
              <select className={FIELD_CLASS} value={selectedAnnotation?.fanStudio ?? "auto"} disabled={closedDates.has(selectedDate) || editingDisabled} onChange={(event) => updateAnnotation({ fanStudio: event.target.value === "auto" ? undefined : event.target.value as "show" | "hide" })}>
                <option value="auto">予定から自動判定</option><option value="show">表示する</option><option value="hide">表示しない</option>
              </select>
            </label>
            <p className="mt-1 text-[10px] font-bold leading-5 text-ink/50">{closedDates.has(selectedDate) ? "休園日はファンスタ・ナイト営業を表示しません。" : selectedFacts?.rooms.length ? `公開済み予定：${selectedFacts.rooms.join("・")}号室。未取得分は表示設定で補完できます。` : "公開済みのファンスタ予定がありません。確認済みの3部屋営業日は手動で表示できます。"}</p>
            <p className="mt-3 text-[11px] font-bold text-ink">{settings.labels.night}：{closedDates.has(selectedDate) ? "休園日" : selectedFacts?.closingTime ? `${selectedFacts.closingTime.slice(0, 5)}閉園${selectedFacts.night ? "・表示する" : "・表示しない"}` : "閉園時刻未確認・表示しない"}</p>
            <p className="mt-1 text-[10px] font-bold text-ink/50">17:00を超える閉園時刻の日に自動表示します。</p>
            <label className="mt-3 flex items-center gap-2 text-[11px] font-bold text-ink"><input type="checkbox" checked={!selectedAnnotation?.hideBirthdays} onChange={(event) => updateAnnotation({ hideBirthdays: !event.target.checked })} />登録済みの誕生日を表示する</label>
            <p className="mt-1 break-words text-[10px] font-bold text-ink/50">{selectedFacts?.birthdays.length ? selectedFacts.birthdays.join("・") : "この日に登録された誕生日はありません。"}</p>
            <label className="mt-3 block text-[11px] font-black text-ink">自由記載
              <textarea className={FIELD_CLASS} rows={2} value={selectedAnnotation?.note ?? ""} maxLength={CROWD_NOTE_MAX_LENGTH} placeholder="例：振替休日（空欄なら非表示）" onChange={(event) => updateAnnotation({ note: event.target.value })} />
            </label>
            <p className="mt-1 text-[10px] font-bold text-ink/50">短い文言がおすすめです。最大{CROWD_NOTE_MAX_LENGTH}文字。休園日にも表示できます。</p>
          </fieldset>}

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black text-ink/55">
            <span>大混雑 {counts.veryBusy}日</span><span>混雑 {counts.busy}日</span><span>普通 {counts.normal}日</span><span>休園日 {counts.closed}日</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={undo} disabled={history.length === 0 || editingDisabled} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-pink/15 bg-white px-3 text-[11px] font-black text-ink/60 disabled:opacity-40"><RotateCcw size={14} aria-hidden="true" />元に戻す</button>
            <button type="button" onClick={resetToNormal} disabled={Object.keys(overrides).length === 0 || editingDisabled} className="min-h-10 rounded-xl border border-pink/15 bg-white px-3 text-[11px] font-black text-ink/60 disabled:opacity-40">すべて普通に戻す</button>
            <button type="button" onClick={() => void saveDraft()} disabled={editingDisabled || (!dirty && Boolean(savedAt))} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-pink px-4 text-[11px] font-black text-white disabled:opacity-40">
              {saving ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}下書き保存
            </button>
          </div>
          <p className="mt-3 text-[10px] font-bold text-ink/45">{dirty ? "この月の混雑度・表示情報に未保存の変更があります。" : savedAt ? `保存済み：${new Date(savedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}` : "この月の下書きはまだ保存していません。"}</p>
          {loadError && <div className="mt-3 rounded-xl bg-[#fff0f2] p-3 text-[11px] font-bold text-[#a34859]">{loadError}<button type="button" onClick={() => setReloadRevision((value) => value + 1)} className="ml-2 underline">再読み込み</button></div>}
          {feedback && <p role="status" className={`mt-3 rounded-xl p-3 text-[11px] font-bold ${feedbackError ? "bg-[#fff0f2] text-[#a34859]" : "bg-mint/10 text-[#35745f]"}`}>{feedback}</p>}

          <fieldset disabled={editingDisabled} className="mt-6 min-w-0 border-t border-pink/15 pt-5">
            <legend className="pt-5 text-[15px] font-black text-ink">全月共通の設定</legend>
            <p className="mt-1 text-[11px] font-bold leading-5 text-ink/55">イベント期間と表示文言は、月をまたいで使います。</p>
            <details className="mt-3 rounded-xl border border-pink/15 bg-white p-3">
              <summary className="cursor-pointer text-[12px] font-black text-pink">表示文言を編集</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {LABEL_FIELDS.map(({ key, label }) => <label key={key} className="block min-w-0 text-[11px] font-bold text-ink">{label}<input className={FIELD_CLASS} value={settings.labels[key]} maxLength={CROWD_LABEL_MAX_LENGTH} onChange={(event) => setSettings((current) => ({ ...current, labels: { ...current.labels, [key]: event.target.value } }))} /></label>)}
              </div>
              <p className="mt-2 text-[10px] font-bold text-ink/50">開始・終了の文言はイベント名の後ろ、誕生日の文言はキャラクター名の後ろに付きます。</p>
            </details>
            <p className="mt-4 text-[12px] font-black text-ink">季節イベント</p>
            <p className="mt-1 text-[10px] font-bold leading-5 text-ink/50">ハロウィーンや夏イベントの開始日・最終日を登録します。画像には該当する日だけ表示します。</p>
            <div className="mt-3 space-y-3">
              {settings.events.map((event, index) => <div key={event.id} className="min-w-0 rounded-xl border border-pink/15 bg-white p-3">
                <div className="flex items-start gap-2">
                  <label className="min-w-0 flex-1 text-[11px] font-bold text-ink">イベント名<input className={FIELD_CLASS} value={event.name} maxLength={CROWD_EVENT_NAME_MAX_LENGTH} placeholder="例：ハロウィーン" onChange={(change) => setSettings((current) => ({ ...current, events: current.events.map((item) => item.id === event.id ? { ...item, name: change.target.value } : item) }))} /></label>
                  <button type="button" aria-label={`イベント${index + 1}を削除`} onClick={() => setSettings((current) => ({ ...current, events: current.events.filter((item) => item.id !== event.id) }))} className="mt-5 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink/50 hover:bg-pink/10"><Trash2 size={16} aria-hidden="true" /></button>
                </div>
                <div className="mt-2 grid min-w-0 grid-cols-2 gap-2">
                  {([ ["startDate", "開始日"], ["endDate", "終了日（最終日）"] ] as const).map(([key, label]) => <label key={key} className="min-w-0 text-[11px] font-bold text-ink">{label}<input type="date" min="2000-01-01" max="2100-12-31" className={`${FIELD_CLASS} px-1`} value={event[key]} onChange={(change) => setSettings((current) => ({ ...current, events: current.events.map((item) => item.id === event.id ? { ...item, [key]: change.target.value } : item) }))} /></label>)}
                </div>
              </div>)}
            </div>
            <button type="button" disabled={settings.events.length >= CROWD_EVENT_MAX_COUNT} onClick={() => setSettings((current) => ({ ...current, events: [...current.events, { id: crypto.randomUUID(), name: "", startDate: `${month}-01`, endDate: `${month}-01` }] }))} className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-pink/15 bg-white px-3 text-[11px] font-black text-pink disabled:opacity-40"><Plus size={14} aria-hidden="true" />イベントを追加</button>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => void saveSettings()} disabled={!settingsDirty && Boolean(settingsAt)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-pink px-4 text-[11px] font-black text-white disabled:opacity-40">{saving ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}共通設定を保存</button></div>
            <p className="mt-2 text-[10px] font-bold text-ink/50">{settingsDirty ? "イベント・表示文言に未保存の変更があります。" : settingsAt ? "イベント・表示文言は保存済みです。" : "イベント・表示文言はまだ保存していません。"}</p>
          </fieldset>
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
                  {calendar && <CrowdCalendarCard calendar={calendar} createdOn={createdOn} settings={settings} annotations={annotations} facts={facts} />}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-ink/45">設定した文言と日付の情報を画像に反映します。月外の日は薄灰です。</p>
          {overflowDates.length > 0 && <p role="alert" className="mt-3 rounded-xl bg-[#fff0f2] p-3 text-[11px] font-bold leading-6 text-[#a34859]">{overflowDates.map((date) => `${Number(date.slice(-2))}日`).join("・")}の文字がマスに収まりません。表示文言・イベント名・自由記載を短くしてください。収まるまで画像出力を停止します。</p>}
        </div>
      </div>

      <div aria-hidden="true" style={{ position: "fixed", top: 0, left: -20000, pointerEvents: "none" }}>
        <div ref={captureRef} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>{calendar && <CrowdCalendarCard calendar={calendar} createdOn={createdOn} settings={settings} annotations={annotations} facts={facts} />}</div>
      </div>
    </section>
  );
}
