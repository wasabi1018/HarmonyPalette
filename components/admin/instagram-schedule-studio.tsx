"use client";

import {
  CalendarDays,
  Check,
  Clipboard,
  Download,
  ImageDown,
  Instagram,
  LoaderCircle,
  Package,
  Sparkles,
} from "lucide-react";
import { toBlob } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getEntryCharacterNames,
  type ScheduleEntry,
  useScheduleEntries,
} from "@/lib/schedule-store";
import { fanStudioFallbackName, isFanStudioGreeting } from "@/lib/schedule-display";

type GenerationMode = "week" | "month";
type ThemeKey = "pink" | "sky" | "lavender";

type WeekPeriod = {
  id: string;
  start: string;
  end: string;
};

type Theme = {
  name: string;
  accent: string;
  accentDark: string;
  soft: string;
  canvas: string;
  secondary: string;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const FAN_STUDIO_EVENT = "ファンスタジオ";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const themes: Record<ThemeKey, Theme> = {
  pink: {
    name: "やわらかピンク",
    accent: "#eb6e98",
    accentDark: "#d95783",
    soft: "#fff0f5",
    canvas: "#fff9fb",
    secondary: "#aa91cf",
  },
  sky: {
    name: "さわやかブルー",
    accent: "#68acd3",
    accentDark: "#438db8",
    soft: "#eaf7fd",
    canvas: "#f8fcff",
    secondary: "#82c9ad",
  },
  lavender: {
    name: "上品ラベンダー",
    accent: "#9b83c6",
    accentDark: "#7d64ad",
    soft: "#f3effb",
    canvas: "#fbf9ff",
    secondary: "#eb6e98",
  },
};

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isoFromDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = dateFromIso(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoFromDate(date);
}

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function startOfWeek(value: string) {
  const date = dateFromIso(value);
  const distanceFromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - distanceFromMonday);
  return isoFromDate(date);
}

function endOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return isoFromDate(new Date(Date.UTC(year, monthNumber, 0)));
}

function getMonthPeriods(month: string) {
  const firstDay = `${month}-01`;
  const lastDay = endOfMonth(month);
  const periods: WeekPeriod[] = [];
  let current = startOfWeek(firstDay);

  while (current <= lastDay) {
    periods.push({
      id: current,
      start: current,
      end: addDays(current, 6),
    });
    current = addDays(current, 7);
  }

  return periods;
}

function datesInPeriod(period: WeekPeriod) {
  return Array.from({ length: 7 }, (_, index) => addDays(period.start, index));
}

function formatShortDate(value: string, withWeekday = true) {
  const date = dateFromIso(value);
  const base = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  return withWeekday ? `${base}(${WEEKDAYS[date.getUTCDay()]})` : base;
}

function formatLongRange(period: WeekPeriod) {
  return `${formatShortDate(period.start)} – ${formatShortDate(period.end)}`;
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

function entryOccursOn(entry: ScheduleEntry, date: string) {
  return entry.date <= date && (entry.endDate ?? entry.date) >= date;
}

function eventNameForEntry(entry: ScheduleEntry) {
  return isFanStudioGreeting(entry) ? FAN_STUDIO_EVENT : entry.title;
}

function characterNamesForCell(entries: ScheduleEntry[], date: string, eventName: string) {
  const names = entries
    .filter(
      (entry) =>
        entryOccursOn(entry, date)
        && eventNameForEntry(entry) === eventName,
    )
    .flatMap((entry) => {
      const registeredNames = getEntryCharacterNames(entry);
      if (registeredNames.length > 0) return registeredNames;
      return isFanStudioGreeting(entry) ? [fanStudioFallbackName(entry)] : [];
    });

  return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right, "ja"));
}

function fileNameForPeriod(period: WeekPeriod) {
  return `harmony-palette_${period.start}_${period.end}.png`;
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

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(value = new Date()) {
  const year = Math.max(1980, value.getFullYear());
  const date = ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate();
  const time = (value.getHours() << 11) | (value.getMinutes() << 5) | (value.getSeconds() >> 1);
  return { date, time };
}

function joinByteArrays(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createZip(files: Array<{ name: string; bytes: Uint8Array }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const timestamp = dosDateTime();
  let localOffset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, timestamp.time);
    writeUint16(localView, 12, timestamp.date);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, file.bytes.length);
    writeUint32(localView, 22, file.bytes.length);
    writeUint16(localView, 26, name.length);
    writeUint16(localView, 28, 0);
    local.set(name, 30);
    localParts.push(local, file.bytes);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, timestamp.time);
    writeUint16(centralView, 14, timestamp.date);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, file.bytes.length);
    writeUint32(centralView, 24, file.bytes.length);
    writeUint16(centralView, 28, name.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length + file.bytes.length;
  }

  const centralDirectory = joinByteArrays(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, localOffset);
  writeUint16(endView, 20, 0);

  const archive = joinByteArrays([...localParts, centralDirectory, end]);
  return new Blob([archive.buffer], { type: "application/zip" });
}

function ScheduleInstagramCard({
  period,
  entries,
  eventNames,
  theme,
  targetMonth,
  pageIndex,
  pageCount,
}: {
  period: WeekPeriod;
  entries: ScheduleEntry[];
  eventNames: string[];
  theme: Theme;
  targetMonth?: string;
  pageIndex: number;
  pageCount: number;
}) {
  const dates = datesInPeriod(period);
  const columns = eventNames.length > 0 ? eventNames : ["イベント未選択"];
  const columnFontSize = columns.length >= 7 ? 15 : columns.length >= 5 ? 17 : 20;
  const cellFontSize = columns.length >= 7 ? 14 : columns.length >= 5 ? 16 : 19;
  const tableColumns = `122px repeat(${columns.length}, minmax(0, 1fr))`;

  return (
    <article
      style={{
        position: "relative",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        overflow: "hidden",
        background: theme.canvas,
        color: "#3e3540",
        fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
        padding: "54px 54px 36px",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          right: -120,
          top: -150,
          borderRadius: "50%",
          background: theme.soft,
        }}
      />
      <span
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          left: -90,
          bottom: 60,
          borderRadius: "50%",
          background: theme.soft,
        }}
      />

      <header style={{ position: "relative", height: 160 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                display: "grid",
                width: 42,
                height: 42,
                placeItems: "center",
                borderRadius: 14,
                background: theme.accent,
                color: "#fff",
                fontSize: 23,
                fontWeight: 900,
              }}
            >
              H
            </span>
            <span style={{ fontSize: 23, fontWeight: 900, letterSpacing: "0.04em" }}>
              Harmony <span style={{ color: theme.accentDark }}>Palette</span>
            </span>
          </div>
          <span
            style={{
              borderRadius: 999,
              background: theme.soft,
              color: theme.accentDark,
              padding: "11px 20px",
              fontSize: 19,
              fontWeight: 900,
              letterSpacing: "0.1em",
            }}
          >
            WEEKLY SCHEDULE
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 26,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 52, fontWeight: 900, letterSpacing: "-0.04em" }}>
              {formatLongRange(period)} の予定
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            {pageCount > 1 && (
              <p
                style={{
                  margin: "0 0 6px",
                  color: theme.accentDark,
                  fontSize: 21,
                  fontWeight: 900,
                }}
              >
                {pageIndex + 1} / {pageCount}
              </p>
            )}
          </div>
        </div>
      </header>

      <main
        style={{
          position: "relative",
          display: "grid",
          height: 980,
          gridTemplateRows: "98px repeat(7, 114px)",
          gap: 12,
          marginTop: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            minWidth: 0,
            gridTemplateColumns: tableColumns,
            overflow: "hidden",
            borderRadius: 24,
            background: theme.accent,
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "grid",
              placeItems: "center",
              borderRight: "2px solid rgba(255,255,255,0.28)",
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.08em",
            }}
          >
            日付
          </div>
          {columns.map((eventName) => (
            <div
              key={eventName}
              style={{
                display: "grid",
                minWidth: 0,
                placeItems: "center",
                borderRight: "2px solid rgba(255,255,255,0.22)",
                padding: "8px 10px",
                textAlign: "center",
                fontSize: columnFontSize,
                fontWeight: 900,
                lineHeight: 1.35,
                wordBreak: "break-word",
              }}
            >
              {eventName}
            </div>
          ))}
        </div>

        {dates.map((date) => {
          const parts = dateParts(date);
          const outsideTargetMonth = targetMonth ? !date.startsWith(targetMonth) : false;

          return (
            <section
              key={date}
              style={{
                display: "grid",
                minWidth: 0,
                gridTemplateColumns: tableColumns,
                overflow: "hidden",
                border: `2px solid ${outsideTargetMonth ? "#eee8ee" : theme.soft}`,
                borderRadius: 24,
                background: outsideTargetMonth ? "rgba(255,255,255,0.55)" : "#fff",
                boxShadow: outsideTargetMonth ? "none" : "0 8px 22px rgba(98,66,88,0.055)",
                opacity: outsideTargetMonth ? 0.58 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  borderRight: `2px solid ${theme.soft}`,
                  background: parts.weekend ? theme.soft : "#fff",
                }}
              >
                <strong style={{ color: theme.accentDark, fontSize: 35, lineHeight: 1 }}>
                  {parts.day}
                </strong>
                <span style={{ color: parts.weekend ? theme.accentDark : "#756b77", fontSize: 18, fontWeight: 900 }}>
                  {parts.weekday}
                </span>
              </div>

              {columns.map((eventName) => {
                const names = characterNamesForCell(entries, date, eventName);
                return (
                  <div
                    key={`${date}-${eventName}`}
                    style={{
                      display: "flex",
                      minWidth: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRight: `2px solid ${theme.soft}`,
                      padding: "8px 10px",
                      textAlign: "center",
                      color: names.length > 0 ? "#514752" : "#bbb3bc",
                      fontSize: cellFontSize,
                      fontWeight: 900,
                      lineHeight: 1.45,
                      overflow: "hidden",
                      wordBreak: "keep-all",
                      flexWrap: "wrap",
                      alignContent: "center",
                    }}
                  >
                    {names.length > 0
                      ? names.map((name, index) => (
                          <span key={name} style={{ whiteSpace: "nowrap" }}>
                            {name}{index < names.length - 1 ? "・" : ""}
                          </span>
                        ))
                      : "—"}
                  </div>
                );
              })}
            </section>
          );
        })}
      </main>

      <footer
        style={{
          position: "relative",
          display: "flex",
          height: 70,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 30,
          marginTop: 22,
          color: "#776d79",
        }}
      >
        <p style={{ maxWidth: 760, margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.55 }}>
          内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。
        </p>
        <p style={{ margin: 0, color: theme.accentDark, fontSize: 17, fontWeight: 900 }}>
          Harmony Palette
        </p>
      </footer>
    </article>
  );
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

async function captureCard(node: HTMLElement) {
  await document.fonts.ready;
  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio: 1,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#fff",
  });
  if (!blob) throw new Error("画像を作成できませんでした。");
  return blob;
}

export function InstagramScheduleStudio() {
  const scheduleState = useScheduleEntries({ fallbackToSamples: true });
  const today = useMemo(todayInJapan, []);
  const [mode, setMode] = useState<GenerationMode>("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [themeKey, setThemeKey] = useState<ThemeKey>("pink");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const captureRefs = useRef(new Map<string, HTMLElement>());
  const { containerRef, scale } = usePreviewScale();

  const periods = useMemo<WeekPeriod[]>(() => {
    if (mode === "month") return getMonthPeriods(selectedMonth);
    const start = startOfWeek(selectedDate);
    return [{ id: start, start, end: addDays(start, 6) }];
  }, [mode, selectedDate, selectedMonth]);

  useEffect(() => {
    setPreviewIndex(0);
  }, [mode, selectedDate, selectedMonth]);

  const periodRange = useMemo(
    () => ({
      start: periods[0].start,
      end: periods[periods.length - 1].end,
    }),
    [periods],
  );

  const eventOptions = useMemo(() => {
    const relevantEntries = scheduleState.entries.filter(
      (entry) =>
        entry.date <= periodRange.end
        && (entry.endDate ?? entry.date) >= periodRange.start,
    );
    const hasFanStudio = relevantEntries.some(isFanStudioGreeting);
    const regularEvents = Array.from(
      new Set(
        relevantEntries
          .filter((entry) => !isFanStudioGreeting(entry))
          .map((entry) => entry.title.trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right, "ja"));

    return hasFanStudio ? [FAN_STUDIO_EVENT, ...regularEvents] : regularEvents;
  }, [periodRange, scheduleState.entries]);

  useEffect(() => {
    setSelectedEvents((current) => {
      const availableSelection = current.filter((eventName) => eventOptions.includes(eventName));
      if (availableSelection.length > 0) return availableSelection;
      return eventOptions.slice(0, Math.min(4, eventOptions.length));
    });
  }, [eventOptions]);

  const filteredEntries = useMemo(
    () =>
      scheduleState.entries.filter(
        (entry) =>
          selectedEvents.includes(eventNameForEntry(entry))
          && entry.date <= periodRange.end
          && (entry.endDate ?? entry.date) >= periodRange.start,
      ),
    [periodRange, scheduleState.entries, selectedEvents],
  );

  const activePeriod = periods[Math.min(previewIndex, periods.length - 1)] ?? periods[0];
  const theme = themes[themeKey];

  const caption = useMemo(() => {
    if (mode === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      return `＼${year}年${month}月のスケジュール／

1週間ごとに見やすくまとめました。
お出かけ日の確認用に、ぜひ保存してお使いください。

※内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。

#ハーモニーランド #サンリオ #大分観光 #子連れおでかけ #HarmonyPalette`;
    }

    return `＼${formatLongRange(activePeriod)}のスケジュール／

今週の予定をまとめました。
お出かけ前の確認用に、ぜひ保存してお使いください。

※内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。

#ハーモニーランド #サンリオ #大分観光 #子連れおでかけ #HarmonyPalette`;
  }, [activePeriod, mode, selectedMonth]);

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setFeedback("投稿文をコピーしました。");
    } catch {
      setFeedback("コピーできませんでした。下の投稿文を選択してコピーしてください。");
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setFeedback("");
    try {
      if (mode === "week") {
        const node = captureRefs.current.get(activePeriod.id);
        if (!node) throw new Error("画像の準備ができていません。");
        const blob = await captureCard(node);
        downloadBlob(blob, fileNameForPeriod(activePeriod));
        setFeedback("Instagram用画像を保存しました。");
        return;
      }

      const files: Array<{ name: string; bytes: Uint8Array }> = [];
      for (let index = 0; index < periods.length; index += 1) {
        setFeedback(`${index + 1} / ${periods.length}枚目を作成中…`);
        const period = periods[index];
        const node = captureRefs.current.get(period.id);
        if (!node) throw new Error("画像の準備ができていません。");
        const blob = await captureCard(node);
        files.push({
          name: fileNameForPeriod(period),
          bytes: new Uint8Array(await blob.arrayBuffer()),
        });
      }
      const archive = createZip(files);
      downloadBlob(archive, `harmony-palette_${selectedMonth}_weekly-schedules.zip`);
      setFeedback(`${files.length}枚の画像をZIPにまとめて保存しました。`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "画像の作成に失敗しました。");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(340px,0.72fr)_minmax(0,1.28fr)]">
      <aside className="min-w-0 space-y-5">
        <section className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink">
              <Instagram size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">1. PERIOD</p>
              <h2 className="mt-1 text-[17px] font-black text-ink">作成する期間</h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#fff8fb] p-1.5">
            {([
              ["week", "1週間"],
              ["month", "1か月分"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`min-h-11 rounded-xl px-3 text-[12px] font-black transition ${
                  mode === value ? "bg-white text-pink shadow-sm" : "text-ink/45 hover:text-pink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-black text-ink/55">
              {mode === "week" ? "週に含まれる日" : "作成する月"}
            </span>
            <input
              type={mode === "week" ? "date" : "month"}
              value={mode === "week" ? selectedDate : selectedMonth}
              onChange={(event) => {
                if (!event.target.value) return;
                if (mode === "week") setSelectedDate(event.target.value);
                else setSelectedMonth(event.target.value);
              }}
              className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10"
            />
          </label>

          <p className="mt-3 rounded-xl bg-mint/10 px-3 py-2.5 text-[11px] font-bold leading-5 text-[#35745f]">
            {mode === "week"
              ? `月曜始まりの ${formatLongRange(periods[0])} を作成します。`
              : `${periods.length}週間分を作成し、ZIPでまとめて保存します。`}
          </p>
        </section>

        <section className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">2. EVENTS</p>
              <h2 className="mt-1 text-[17px] font-black text-ink">イベント選択</h2>
            </div>
            {selectedEvents.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedEvents([])}
                className="min-h-9 rounded-lg px-2.5 text-[10px] font-black text-ink/40 transition hover:bg-pink/5 hover:text-pink"
              >
                選択解除
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] font-bold leading-5 text-ink/45">
            画像の横軸に載せるイベントを複数選べます。
          </p>
          <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-1">
            {eventOptions.map((eventName) => {
              const checked = selectedEvents.includes(eventName);
              return (
                <label
                  key={eventName}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 text-[12px] font-black transition ${
                    checked ? "border-pink/25 bg-pink/5 text-ink" : "border-ink/10 text-ink/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedEvents((current) =>
                        current.includes(eventName)
                          ? current.filter((value) => value !== eventName)
                          : [...current, eventName],
                      )
                    }
                    className="sr-only"
                  />
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-md ${
                      checked ? "bg-pink text-white" : "border border-ink/15 bg-white"
                    }`}
                  >
                    {checked && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                  </span>
                  {eventName}
                </label>
              );
            })}
            {eventOptions.length === 0 && (
              <p className="rounded-xl bg-[#fff9fb] px-3 py-4 text-center text-[11px] font-bold text-ink/40">
                この期間に選択できるイベントはありません。
              </p>
            )}
          </div>
          <p className="mt-3 rounded-xl bg-lavender/10 px-3 py-2.5 text-[10px] font-bold leading-5 text-[#745f99]">
            ファンスタジオの予定は、日ごとのキャラクター名を1列にまとめます。
          </p>

          <p className="mt-5 text-[10px] font-black tracking-[0.16em] text-pink">3. COLOR</p>
          <h2 className="mt-1 text-[17px] font-black text-ink">画像のカラー</h2>
          <div className="mt-4 grid gap-2">
            {(Object.entries(themes) as Array<[ThemeKey, Theme]>).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setThemeKey(key)}
                className={`flex min-h-11 items-center justify-between rounded-xl border px-3.5 text-left text-[12px] font-black transition ${
                  themeKey === key ? "border-pink/30 bg-[#fffafd] text-ink" : "border-ink/10 text-ink/45"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-4 w-4 rounded-full" style={{ background: item.accent }} />
                  {item.name}
                </span>
                {themeKey === key && <Check size={15} className="text-pink" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-lavender/15 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-lavender">CAPTION</p>
              <h2 className="mt-1 text-[17px] font-black text-ink">投稿文も一緒に準備</h2>
            </div>
            <button
              type="button"
              onClick={handleCopyCaption}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-lavender/10 px-3 text-[11px] font-black text-lavender transition hover:bg-lavender/15"
            >
              <Clipboard size={14} aria-hidden="true" />
              コピー
            </button>
          </div>
          <textarea
            readOnly
            value={caption}
            aria-label="Instagram投稿文"
            className="mt-4 h-52 w-full resize-none rounded-xl border border-ink/10 bg-[#fcfaff] p-3 text-[11px] font-bold leading-5 text-ink/60 outline-none"
          />
        </section>
      </aside>

      <section className="min-w-0 rounded-[26px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 border-b border-pink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-pink">
              <Sparkles size={14} aria-hidden="true" />
              LIVE PREVIEW
            </p>
            <h2 className="mt-1 text-[20px] font-black text-ink">Instagram投稿プレビュー</h2>
            <p className="mt-1 text-[11px] font-bold text-ink/45">
              1080 × 1350px・フィード投稿向け
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || selectedEvents.length === 0}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(235,110,152,0.22)] transition hover:bg-[#df638e] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isDownloading ? (
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
            ) : mode === "month" ? (
              <Package size={17} aria-hidden="true" />
            ) : (
              <ImageDown size={17} aria-hidden="true" />
            )}
            {isDownloading
              ? "画像を作成中…"
              : mode === "month"
                ? `${periods.length}枚をまとめて保存`
                : "PNG画像を保存"}
          </button>
        </div>

        {mode === "month" && periods.length > 1 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="週のプレビュー切り替え">
            {periods.map((period, index) => (
              <button
                key={period.id}
                type="button"
                onClick={() => setPreviewIndex(index)}
                className={`min-h-10 shrink-0 rounded-xl px-3 text-[11px] font-black transition ${
                  index === previewIndex
                    ? "bg-pink text-white"
                    : "border border-pink/10 bg-[#fffafd] text-ink/50 hover:text-pink"
                }`}
              >
                第{index + 1}週
                <span className="ml-1.5 text-[9px] opacity-75">{formatShortDate(period.start, false)}〜</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-[22px] bg-[linear-gradient(135deg,#f5eef3_0%,#eee9f5_100%)] p-3 sm:p-5">
          <div ref={containerRef} className="mx-auto w-full max-w-[640px] overflow-hidden">
            <div
              style={{
                width: CARD_WIDTH * scale,
                height: CARD_HEIGHT * scale,
              }}
            >
              <div
                style={{
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <ScheduleInstagramCard
                  period={activePeriod}
                  entries={filteredEntries}
                  eventNames={selectedEvents}
                  theme={theme}
                  targetMonth={mode === "month" ? selectedMonth : undefined}
                  pageIndex={previewIndex}
                  pageCount={periods.length}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-[#fff9fb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-[11px] font-black text-ink/55">
            <CalendarDays size={15} className="text-pink" aria-hidden="true" />
            選択したイベントが画像の横軸に並びます
          </p>
          <p className="flex items-center gap-2 text-[10px] font-bold text-ink/40">
            <Download size={13} aria-hidden="true" />
            管理中の予定が自動で反映されます
          </p>
        </div>

        {scheduleState.status === "loading" && (
          <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-ink/45">
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            最新のスケジュールを読み込んでいます…
          </p>
        )}
        {scheduleState.status === "error" && (
          <p className="mt-3 text-[11px] font-bold text-[#b65364]">
            最新データを取得できなかったため、保存済みの予定でプレビューしています。
          </p>
        )}
        {feedback && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-mint/10 px-3 py-2.5 text-[11px] font-black text-[#35745f]"
          >
            {feedback}
          </p>
        )}
        {selectedEvents.length === 0 && (
          <p className="mt-3 text-[11px] font-bold text-[#b65364]">
            画像に載せるイベントを1つ以上選んでください。
          </p>
        )}
      </section>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -20000,
          top: 0,
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        {periods.map((period, index) => (
          <div
            key={`${period.id}-${themeKey}-${selectedEvents.join("|")}`}
            ref={(node) => {
              if (node) captureRefs.current.set(period.id, node);
              else captureRefs.current.delete(period.id);
            }}
          >
            <ScheduleInstagramCard
              period={period}
              entries={filteredEntries}
              eventNames={selectedEvents}
              theme={theme}
              targetMonth={mode === "month" ? selectedMonth : undefined}
              pageIndex={index}
              pageCount={periods.length}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
