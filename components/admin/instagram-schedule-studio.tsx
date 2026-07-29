"use client";

import {
  CalendarDays,
  Check,
  CircleAlert,
  Clipboard,
  Download,
  Heart,
  ImageDown,
  Instagram,
  LayoutTemplate,
  LoaderCircle,
  Package,
  Sparkles,
} from "lucide-react";
import { toBlob } from "html-to-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Character } from "@/data/types";
import { sortCharacterNames, useCharacters } from "@/lib/character-store";
import {
  getEntryCharacterNames,
  type ScheduleEntry,
  useScheduleEntries,
} from "@/lib/schedule-store";
import {
  fanStudioFallbackName,
  isFanStudioGreeting,
  shortFanStudioLocation,
  specialAppearance,
} from "@/lib/schedule-display";

type GenerationMode = "week" | "month";
type ImageTemplate = "overview" | "fan-studio" | "fan-studio-daily";
type ThemeKey = "pink" | "sky" | "lavender";
type FanStudioCellState = "none" | "normal" | "special";

type DailyFanStudioItem = {
  name: string;
  special: boolean;
};

type DailyFanStudioRow = {
  time: string;
  cells: DailyFanStudioItem[][];
};

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
const DEFAULT_SPECIAL_LEGEND = "特別な姿の回あり";
const DEFAULT_SPECIAL_EMOJI = "☀️";
const DEFAULT_SPECIAL_EMOJI_MEANING = "日焼けした姿";
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

function formatJapaneseDate(value: string) {
  const date = dateFromIso(value);
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${WEEKDAYS[date.getUTCDay()]}）`;
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

function characterNamesForEntry(entry: ScheduleEntry) {
  const registeredNames = getEntryCharacterNames(entry);
  if (registeredNames.length > 0) return registeredNames;
  return isFanStudioGreeting(entry) ? [fanStudioFallbackName(entry)] : [];
}

function fanStudioCellState(
  name: string,
  date: string,
  entries: ScheduleEntry[],
  regularCharacterNames: Set<string>,
): FanStudioCellState {
  const appearances = entries
    .filter(
      (entry) =>
        isFanStudioGreeting(entry)
        && entryOccursOn(entry, date)
        && characterNamesForEntry(entry).includes(name),
    )
    .map((entry) => specialAppearance(entry));

  if (appearances.some(Boolean)) return "special";
  if (appearances.length > 0 || regularCharacterNames.has(name)) return "normal";
  return "none";
}

function buildFanStudioRows(
  period: WeekPeriod,
  entries: ScheduleEntry[],
  characters: Character[],
) {
  const dates = datesInPeriod(period);
  const periodEntries = entries.filter(
    (entry) =>
      isFanStudioGreeting(entry)
      && entry.date <= period.end
      && (entry.endDate ?? entry.date) >= period.start,
  );
  const regularCharacterNames = new Set(
    characters
      .filter((character) => character.isFanStudioRegular)
      .map((character) => character.name),
  );
  const names = sortCharacterNames([
    ...periodEntries.flatMap(characterNamesForEntry),
    ...regularCharacterNames,
  ], characters);

  return names.map((name) => ({
    name,
    cells: dates.map((date) =>
      fanStudioCellState(name, date, periodEntries, regularCharacterNames)),
  }));
}

function roomSortValue(room: string) {
  const roomNumber = Number(room.match(/\d+/)?.[0]);
  return Number.isFinite(roomNumber) ? roomNumber : Number.MAX_SAFE_INTEGER;
}

function buildDailyFanStudioSchedule(date: string, entries: ScheduleEntry[]) {
  const dailyEntries = entries.filter(
    (entry) => isFanStudioGreeting(entry) && entryOccursOn(entry, date),
  );
  const rooms = Array.from(
    new Set(dailyEntries.map((entry) => shortFanStudioLocation(entry.location))),
  ).sort((left, right) => (
    roomSortValue(left) - roomSortValue(right)
    || left.localeCompare(right, "ja")
  ));
  const times = Array.from(
    new Set(dailyEntries.map((entry) => entry.startTime).filter(Boolean)),
  ).sort();

  const rows: DailyFanStudioRow[] = times.map((time) => ({
    time,
    cells: rooms.map((room) => {
      const items = new Map<string, boolean>();
      dailyEntries
        .filter(
          (entry) =>
            entry.startTime === time
            && shortFanStudioLocation(entry.location) === room,
        )
        .forEach((entry) => {
          const special = Boolean(specialAppearance(entry));
          characterNamesForEntry(entry).forEach((name) => {
            items.set(name, Boolean(items.get(name)) || special);
          });
        });

      return Array.from(items, ([name, special]) => ({ name, special }));
    }),
  }));

  return { rooms, rows };
}

function fileNameForPeriod(period: WeekPeriod, template: ImageTemplate) {
  if (template === "fan-studio-daily") {
    return `harmony-palette_fanstudio_daily_${period.start}.png`;
  }
  if (template === "fan-studio") {
    return `harmony-palette_fanstudio_${period.start}_${period.end}.png`;
  }
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

export function FanStudioInstagramCard({
  period,
  entries,
  characters,
  theme,
  specialLegend,
  targetMonth,
  pageIndex,
  pageCount,
}: {
  period: WeekPeriod;
  entries: ScheduleEntry[];
  characters: Character[];
  theme: Theme;
  specialLegend: string;
  targetMonth?: string;
  pageIndex: number;
  pageCount: number;
}) {
  const dates = datesInPeriod(period);
  const rows = buildFanStudioRows(period, entries, characters);
  const rowGap = rows.length >= 13 ? 4 : rows.length >= 10 ? 6 : 8;
  const nameFontSize = rows.length >= 14 ? 16 : rows.length >= 11 ? 18 : 21;
  const heartSize = rows.length >= 14 ? 25 : rows.length >= 11 ? 31 : 38;
  const legendFontSize = specialLegend.length >= 18 ? 18 : 20;
  const tableColumns = "236px repeat(7, minmax(0, 1fr))";

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
        padding: "40px 46px 30px",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 330,
          height: 330,
          right: -120,
          top: -160,
          borderRadius: "50%",
          background: theme.soft,
        }}
      />
      <span
        style={{
          position: "absolute",
          width: 190,
          height: 190,
          left: -100,
          bottom: -62,
          borderRadius: "50%",
          background: theme.soft,
        }}
      />

      <header style={{ position: "relative", height: 354 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                display: "grid",
                width: 56,
                height: 56,
                placeItems: "center",
                borderRadius: 16,
                background: theme.accent,
                color: "#fff",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              H
            </span>
            <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.02em" }}>
              Harmony <span style={{ color: theme.accentDark }}>Palette</span>
            </span>
          </div>
          <span
            style={{
              borderRadius: 999,
              border: `2px solid ${theme.soft}`,
              background: "rgba(255,255,255,0.58)",
              color: theme.accentDark,
              padding: "12px 26px",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.1em",
            }}
          >
            WEEKLY SCHEDULE
          </span>
        </div>

        <div
          style={{
            display: "inline-flex",
            marginTop: 32,
            borderRadius: 999,
            background: theme.soft,
            color: theme.secondary,
            padding: "9px 24px",
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: "0.14em",
          }}
        >
          GREETING SCHEDULE
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 68, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08 }}>
              ファンスタジオ
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 31, fontWeight: 900, letterSpacing: "-0.02em" }}>
              {formatLongRange(period)}
            </p>
          </div>
          {pageCount > 1 && (
            <p style={{ margin: "0 0 8px", color: theme.accentDark, fontSize: 20, fontWeight: 900 }}>
              {pageIndex + 1} / {pageCount}
            </p>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            display: "flex",
            alignItems: "center",
            gap: 30,
            fontSize: 20,
            fontWeight: 900,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Heart size={34} fill={theme.accent} color={theme.accent} strokeWidth={1.5} />
            通常
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: legendFontSize }}>
            <Heart size={34} fill={theme.secondary} color={theme.secondary} strokeWidth={1.5} />
            {specialLegend}
          </span>
        </div>
      </header>

      <main
        style={{
          position: "relative",
          display: "grid",
          height: 824,
          gridTemplateRows: rows.length > 0
            ? `92px repeat(${rows.length}, minmax(0, 1fr))`
            : "92px 1fr",
          gap: rowGap,
          marginTop: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            minWidth: 0,
            gridTemplateColumns: tableColumns,
            overflow: "hidden",
            borderRadius: 22,
            background: theme.accent,
            color: "#fff",
            boxShadow: `0 8px 22px ${theme.soft}`,
          }}
        >
          <div
            style={{
              display: "grid",
              placeItems: "center",
              borderRight: "2px solid rgba(255,255,255,0.25)",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            キャラクター
          </div>
          {dates.map((date) => {
            const parts = dateParts(date);
            const weekdayColor = parts.weekday === "土"
              ? "#317fc4"
              : parts.weekday === "日"
                ? "#d92d46"
                : "#fff";
            const outsideTargetMonth = targetMonth ? !date.startsWith(targetMonth) : false;

            return (
              <div
                key={date}
                style={{
                  display: "grid",
                  minWidth: 0,
                  placeItems: "center",
                  borderRight: "2px solid rgba(255,255,255,0.2)",
                  opacity: outsideTargetMonth ? 0.64 : 1,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                <span>{parts.month}/{parts.day}</span>
                <span style={{ color: weekdayColor }}>{parts.weekday}</span>
              </div>
            );
          })}
        </div>

        {rows.length > 0 ? rows.map((row) => (
          <section
            key={row.name}
            style={{
              display: "grid",
              minWidth: 0,
              gridTemplateColumns: tableColumns,
              overflow: "hidden",
              border: `2px solid ${theme.soft}`,
              borderRadius: 18,
              background: "#fff",
              boxShadow: "0 6px 18px rgba(98,66,88,0.055)",
            }}
          >
            <div
              style={{
                display: "flex",
                minWidth: 0,
                alignItems: "center",
                borderRight: `2px solid ${theme.soft}`,
                padding: "0 20px",
                fontSize: nameFontSize,
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              {row.name}
            </div>
            {row.cells.map((state, index) => {
              const date = dates[index];
              const parts = dateParts(date);
              const color = state === "special" ? theme.secondary : theme.accent;
              const outsideTargetMonth = targetMonth ? !date.startsWith(targetMonth) : false;

              return (
                <div
                  key={`${row.name}-${date}`}
                  style={{
                    display: "grid",
                    minWidth: 0,
                    placeItems: "center",
                    borderRight: `2px solid ${theme.soft}`,
                    background: parts.weekend ? `${theme.soft}72` : "#fff",
                    opacity: outsideTargetMonth ? 0.62 : 1,
                  }}
                >
                  {state !== "none" && (
                    <Heart size={heartSize} fill={color} color={color} strokeWidth={1.4} />
                  )}
                </div>
              );
            })}
          </section>
        )) : (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              border: `2px solid ${theme.soft}`,
              borderRadius: 22,
              background: "#fff",
              color: "#9b919c",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            この週のファンスタジオ予定はありません
          </div>
        )}
      </main>

      <footer
        style={{
          position: "relative",
          display: "flex",
          height: 52,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          marginTop: 12,
          color: "#776d79",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CircleAlert size={36} fill={theme.accent} color="#fff" strokeWidth={2.4} />
          <p style={{ maxWidth: 730, margin: 0, fontSize: 15, fontWeight: 800, lineHeight: 1.5 }}>
            内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。
          </p>
        </div>
        <p style={{ margin: 0, color: theme.accentDark, fontSize: 24, fontWeight: 900, whiteSpace: "nowrap" }}>
          Harmony Palette
        </p>
      </footer>
    </article>
  );
}

export function DailyFanStudioInstagramCard({
  date,
  entries,
  theme,
  specialEmoji,
  specialEmojiMeaning,
}: {
  date: string;
  entries: ScheduleEntry[];
  theme: Theme;
  specialEmoji: string;
  specialEmojiMeaning: string;
}) {
  const { rooms, rows } = buildDailyFanStudioSchedule(date, entries);
  const rowGap = rows.length >= 13 ? 4 : rows.length >= 10 ? 6 : 8;
  const timeWidth = 150;
  const tableColumns = `${timeWidth}px repeat(${Math.max(rooms.length, 1)}, minmax(0, 1fr))`;
  const cellFontSize = rooms.length >= 3 ? 20 : 23;
  const compactRows = rows.length >= 12;

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
        padding: "40px 46px 30px",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 330,
          height: 330,
          right: -120,
          top: -160,
          borderRadius: "50%",
          background: theme.soft,
        }}
      />
      <span
        style={{
          position: "absolute",
          width: 190,
          height: 190,
          left: -100,
          bottom: -62,
          borderRadius: "50%",
          background: theme.soft,
        }}
      />

      <header style={{ position: "relative", height: 305 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                display: "grid",
                width: 56,
                height: 56,
                placeItems: "center",
                borderRadius: 16,
                background: theme.accent,
                color: "#fff",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              H
            </span>
            <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.02em" }}>
              Harmony <span style={{ color: theme.accentDark }}>Palette</span>
            </span>
          </div>
          <span
            style={{
              borderRadius: 999,
              border: `2px solid ${theme.soft}`,
              background: "rgba(255,255,255,0.58)",
              color: theme.accentDark,
              padding: "12px 26px",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.1em",
            }}
          >
            DAILY SCHEDULE
          </span>
        </div>

        <div
          style={{
            display: "inline-flex",
            marginTop: 32,
            borderRadius: 999,
            background: theme.soft,
            color: theme.secondary,
            padding: "9px 24px",
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: "0.14em",
          }}
        >
          GREETING SCHEDULE
        </div>

        <div style={{ marginTop: 20 }}>
          <h1 style={{ margin: 0, fontSize: 68, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08 }}>
            ファンスタジオ
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 31, fontWeight: 900, letterSpacing: "-0.02em" }}>
            {formatJapaneseDate(date)}
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            display: "flex",
            maxWidth: 760,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            fontSize: specialEmojiMeaning.length >= 18 ? 18 : 21,
            fontWeight: 900,
          }}
        >
          <span style={{ fontSize: 30, lineHeight: 1 }}>{specialEmoji}</span>
          <span>{specialEmojiMeaning}</span>
        </div>
      </header>

      <main
        style={{
          position: "relative",
          display: "grid",
          height: 903,
          gridTemplateRows: rows.length > 0
            ? `64px repeat(${rows.length}, minmax(0, 1fr))`
            : "64px 1fr",
          gap: rowGap,
          marginTop: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            minWidth: 0,
            gridTemplateColumns: tableColumns,
            overflow: "hidden",
            borderRadius: 22,
            background: theme.accent,
            color: "#fff",
            boxShadow: `0 8px 22px ${theme.soft}`,
          }}
        >
          <div
            style={{
              display: "grid",
              placeItems: "center",
              borderRight: "2px solid rgba(255,255,255,0.24)",
              fontSize: 23,
              fontWeight: 900,
            }}
          >
            時間
          </div>
          {rooms.map((room) => (
            <div
              key={room}
              style={{
                display: "grid",
                minWidth: 0,
                placeItems: "center",
                borderRight: "2px solid rgba(255,255,255,0.2)",
                fontSize: 25,
                fontWeight: 900,
              }}
            >
              {room}
            </div>
          ))}
        </div>

        {rows.length > 0 ? rows.map((row) => (
          <section
            key={row.time}
            style={{
              display: "grid",
              minWidth: 0,
              gridTemplateColumns: tableColumns,
              overflow: "hidden",
              border: `2px solid ${theme.soft}`,
              borderRadius: 18,
              background: "#fff",
              boxShadow: "0 6px 18px rgba(98,66,88,0.055)",
            }}
          >
            <time
              style={{
                display: "grid",
                placeItems: "center",
                borderRight: `2px solid ${theme.soft}`,
                fontSize: compactRows ? 22 : 27,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.time}
            </time>
            {row.cells.map((items, roomIndex) => (
              <div
                key={`${row.time}-${rooms[roomIndex]}`}
                style={{
                  display: "flex",
                  minWidth: 0,
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  borderRight: `2px solid ${theme.soft}`,
                  padding: "4px 10px",
                  textAlign: "center",
                }}
              >
                {items.map((item) => (
                  <span
                    key={item.name}
                    style={{
                      maxWidth: "100%",
                      fontSize: items.length >= 2 || compactRows ? Math.max(16, cellFontSize - 3) : cellFontSize,
                      fontWeight: 900,
                      lineHeight: 1.28,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.name}{item.special ? ` ${specialEmoji}` : ""}
                  </span>
                ))}
              </div>
            ))}
          </section>
        )) : (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              border: `2px solid ${theme.soft}`,
              borderRadius: 22,
              background: "#fff",
              color: "#9b919c",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            この日のファンスタジオ予定はありません
          </div>
        )}
      </main>

      <footer
        style={{
          position: "relative",
          display: "flex",
          height: 52,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          marginTop: 12,
          color: "#776d79",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CircleAlert size={36} fill={theme.accent} color="#fff" strokeWidth={2.4} />
          <p style={{ maxWidth: 650, margin: 0, fontSize: 14, fontWeight: 800, lineHeight: 1.5 }}>
            内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。
          </p>
        </div>
        <p style={{ margin: 0, color: theme.accentDark, fontSize: 24, fontWeight: 900, whiteSpace: "nowrap" }}>
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
  const characterState = useCharacters({ fallbackToSamples: true });
  const today = useMemo(todayInJapan, []);
  const [template, setTemplate] = useState<ImageTemplate>("overview");
  const [mode, setMode] = useState<GenerationMode>("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [specialLegend, setSpecialLegend] = useState(DEFAULT_SPECIAL_LEGEND);
  const [specialEmoji, setSpecialEmoji] = useState(DEFAULT_SPECIAL_EMOJI);
  const [specialEmojiMeaning, setSpecialEmojiMeaning] = useState(DEFAULT_SPECIAL_EMOJI_MEANING);
  const [themeKey, setThemeKey] = useState<ThemeKey>("pink");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const captureRefs = useRef(new Map<string, HTMLElement>());
  const { containerRef, scale } = usePreviewScale();

  const periods = useMemo<WeekPeriod[]>(() => {
    if (template === "fan-studio-daily") {
      return [{ id: selectedDate, start: selectedDate, end: selectedDate }];
    }
    if (mode === "month") return getMonthPeriods(selectedMonth);
    const start = startOfWeek(selectedDate);
    return [{ id: start, start, end: addDays(start, 6) }];
  }, [mode, selectedDate, selectedMonth, template]);

  useEffect(() => {
    setPreviewIndex(0);
  }, [mode, selectedDate, selectedMonth, template]);

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
  const normalizedSpecialLegend = specialLegend.trim() || DEFAULT_SPECIAL_LEGEND;
  const normalizedSpecialEmoji = specialEmoji.trim() || DEFAULT_SPECIAL_EMOJI;
  const normalizedSpecialEmojiMeaning = specialEmojiMeaning.trim() || DEFAULT_SPECIAL_EMOJI_MEANING;
  const activeFanStudioRows = useMemo(
    () => buildFanStudioRows(activePeriod, scheduleState.entries, characterState.characters),
    [activePeriod, characterState.characters, scheduleState.entries],
  );
  const activeDailyFanStudio = useMemo(
    () => buildDailyFanStudioSchedule(activePeriod.start, scheduleState.entries),
    [activePeriod.start, scheduleState.entries],
  );
  const isDailyTemplate = template === "fan-studio-daily";
  const isBatchMode = !isDailyTemplate && mode === "month";
  const canDownload = template === "fan-studio"
    ? activeFanStudioRows.length > 0
    : isDailyTemplate
      ? activeDailyFanStudio.rows.length > 0
      : selectedEvents.length > 0;

  const caption = useMemo(() => {
    if (isDailyTemplate) {
      return `＼${formatJapaneseDate(activePeriod.start)}のファンスタジオ／

時間・部屋ごとの登場予定をまとめました。
「${normalizedSpecialEmoji}」は「${normalizedSpecialEmojiMeaning}」を表します。

※内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。

#ハーモニーランド #ファンスタジオ #サンリオ #大分観光 #HarmonyPalette`;
    }

    if (template === "fan-studio") {
      if (mode === "month") {
        const [year, month] = selectedMonth.split("-").map(Number);
        return `＼${year}年${month}月のファンスタジオ／

1週間ごとに、キャラクターの登場予定をまとめました。
メインカラーのハートは通常、サブカラーのハートは「${normalizedSpecialLegend}」です。

※内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。

#ハーモニーランド #ファンスタジオ #サンリオ #大分観光 #HarmonyPalette`;
      }

      return `＼${formatLongRange(activePeriod)}のファンスタジオ／

今週会えるキャラクターをまとめました。
メインカラーのハートは通常、サブカラーのハートは「${normalizedSpecialLegend}」です。

※内容は変更になる場合があります。お出かけ前に公式サイトの最新情報をご確認ください。

#ハーモニーランド #ファンスタジオ #サンリオ #大分観光 #HarmonyPalette`;
    }

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
  }, [
    activePeriod,
    isDailyTemplate,
    mode,
    normalizedSpecialEmoji,
    normalizedSpecialEmojiMeaning,
    normalizedSpecialLegend,
    selectedMonth,
    template,
  ]);

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
      if (!isBatchMode) {
        const node = captureRefs.current.get(activePeriod.id);
        if (!node) throw new Error("画像の準備ができていません。");
        const blob = await captureCard(node);
        downloadBlob(blob, fileNameForPeriod(activePeriod, template));
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
          name: fileNameForPeriod(period, template),
          bytes: new Uint8Array(await blob.arrayBuffer()),
        });
      }
      const archive = createZip(files);
      const label = template === "fan-studio" ? "fanstudio" : "schedules";
      downloadBlob(archive, `harmony-palette_${selectedMonth}_weekly-${label}.zip`);
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
              <LayoutTemplate size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">1. TEMPLATE</p>
              <h2 className="mt-1 text-[17px] font-black text-ink">投稿画像の種類</h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-[#fff8fb] p-1.5">
            {([
              ["overview", "全体"],
              ["fan-studio", "週間ファンスタジオ"],
              ["fan-studio-daily", "日別ファンスタジオ"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTemplate(value);
                  setFeedback("");
                }}
                className={`min-h-11 rounded-xl px-2 text-[11px] font-black transition ${
                  template === value ? "bg-white text-pink shadow-sm" : "text-ink/45 hover:text-pink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[10px] font-bold leading-5 text-ink/45">
            {template === "fan-studio"
              ? "キャラクターを縦軸、1週間の日付を横軸にした専用画像を作成します。"
              : template === "fan-studio-daily"
                ? "時間を縦軸、予定のある部屋を横軸にした1日単位の画像を作成します。"
                : "選択したイベントを横軸に並べた、現在のスケジュール画像を作成します。"}
          </p>
        </section>

        <section className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pink/10 text-pink">
              <Instagram size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">2. PERIOD</p>
              <h2 className="mt-1 text-[17px] font-black text-ink">作成する期間</h2>
            </div>
          </div>

          {!isDailyTemplate && (
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
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-black text-ink/55">
              {isDailyTemplate ? "作成する日" : mode === "week" ? "週に含まれる日" : "作成する月"}
            </span>
            <input
              type={isDailyTemplate || mode === "week" ? "date" : "month"}
              value={isDailyTemplate || mode === "week" ? selectedDate : selectedMonth}
              onChange={(event) => {
                if (!event.target.value) return;
                if (isDailyTemplate || mode === "week") setSelectedDate(event.target.value);
                else setSelectedMonth(event.target.value);
              }}
              className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10"
            />
          </label>

          <p className="mt-3 rounded-xl bg-mint/10 px-3 py-2.5 text-[11px] font-bold leading-5 text-[#35745f]">
            {isDailyTemplate
              ? `${formatJapaneseDate(selectedDate)} の予定を1枚作成します。`
              : mode === "week"
              ? `月曜始まりの ${formatLongRange(periods[0])} を作成します。`
              : `${periods.length}週間分を作成し、ZIPでまとめて保存します。`}
          </p>
        </section>

        <section className="rounded-[24px] border border-pink/10 bg-white p-5 shadow-soft sm:p-6">
          {template === "overview" ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black tracking-[0.16em] text-pink">3. EVENTS</p>
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
            </>
          ) : template === "fan-studio" ? (
            <>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">3. APPEARANCE</p>
              <h2 className="mt-1 text-[17px] font-black text-ink">特別な姿の表示</h2>
              <p className="mt-2 text-[11px] font-bold leading-5 text-ink/45">
                サブカラーのハートに添える凡例を変更できます。
              </p>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-black text-ink/55">
                  凡例の文言
                </span>
                <input
                  type="text"
                  value={specialLegend}
                  maxLength={24}
                  onChange={(event) => setSpecialLegend(event.target.value)}
                  placeholder={DEFAULT_SPECIAL_LEGEND}
                  className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10"
                />
              </label>
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-lavender/10 px-3 py-3 text-[11px] font-black text-[#745f99]">
                <span className="flex items-center gap-1.5">
                  <Heart size={17} fill={theme.accent} color={theme.accent} aria-hidden="true" />
                  通常
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Heart size={17} fill={theme.secondary} color={theme.secondary} aria-hidden="true" />
                  <span className="truncate">{normalizedSpecialLegend}</span>
                </span>
              </div>
              <p className="mt-3 text-[10px] font-bold leading-5 text-ink/45">
                この週は{activeFanStudioRows.length}キャラクターをテーブルに表示します。毎日会えるキャラクターも同じ表に含まれます。
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink">3. APPEARANCE</p>
              <h2 className="mt-1 text-[17px] font-black text-ink">特別な姿の絵文字</h2>
              <p className="mt-2 text-[11px] font-bold leading-5 text-ink/45">
                特別な姿のキャラクター名の後ろと、画像上部の凡例に表示します。
              </p>
              <div className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black text-ink/55">
                    絵文字
                  </span>
                  <input
                    type="text"
                    value={specialEmoji}
                    maxLength={8}
                    onChange={(event) => setSpecialEmoji(event.target.value)}
                    placeholder={DEFAULT_SPECIAL_EMOJI}
                    aria-label="特別な姿の絵文字"
                    className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-center text-[20px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black text-ink/55">
                    絵文字の意味
                  </span>
                  <input
                    type="text"
                    value={specialEmojiMeaning}
                    maxLength={30}
                    onChange={(event) => setSpecialEmojiMeaning(event.target.value)}
                    placeholder={DEFAULT_SPECIAL_EMOJI_MEANING}
                    aria-label="特別な姿の絵文字の意味"
                    className="min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition focus:border-pink focus:ring-4 focus:ring-pink/10"
                  />
                </label>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-lavender/10 px-3 py-3 text-[12px] font-black text-[#745f99]">
                <span className="text-[20px] leading-none">{normalizedSpecialEmoji}</span>
                <span className="truncate">{normalizedSpecialEmojiMeaning}</span>
              </div>
              <p className="mt-3 text-[10px] font-bold leading-5 text-ink/45">
                {activeDailyFanStudio.rooms.length > 0
                  ? `${activeDailyFanStudio.rooms.length}部屋・${activeDailyFanStudio.rows.length}時間帯を表示します。予定のない部屋は自動で省略します。`
                  : "この日は表示できるファンスタジオ予定がありません。"}
              </p>
            </>
          )}

          <p className="mt-5 text-[10px] font-black tracking-[0.16em] text-pink">4. COLOR</p>
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
            disabled={isDownloading || !canDownload}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(235,110,152,0.22)] transition hover:bg-[#df638e] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isDownloading ? (
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
            ) : isBatchMode ? (
              <Package size={17} aria-hidden="true" />
            ) : (
              <ImageDown size={17} aria-hidden="true" />
            )}
            {isDownloading
              ? "画像を作成中…"
              : isBatchMode
                ? `${periods.length}枚をまとめて保存`
                : "PNG画像を保存"}
          </button>
        </div>

        {isBatchMode && periods.length > 1 && (
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
                {template === "fan-studio-daily" ? (
                  <DailyFanStudioInstagramCard
                    date={activePeriod.start}
                    entries={scheduleState.entries}
                    theme={theme}
                    specialEmoji={normalizedSpecialEmoji}
                    specialEmojiMeaning={normalizedSpecialEmojiMeaning}
                  />
                ) : template === "fan-studio" ? (
                  <FanStudioInstagramCard
                    period={activePeriod}
                    entries={scheduleState.entries}
                    characters={characterState.characters}
                    theme={theme}
                    specialLegend={normalizedSpecialLegend}
                    targetMonth={mode === "month" ? selectedMonth : undefined}
                    pageIndex={previewIndex}
                    pageCount={periods.length}
                  />
                ) : (
                  <ScheduleInstagramCard
                    period={activePeriod}
                    entries={filteredEntries}
                    eventNames={selectedEvents}
                    theme={theme}
                    targetMonth={mode === "month" ? selectedMonth : undefined}
                    pageIndex={previewIndex}
                    pageCount={periods.length}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-[#fff9fb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-[11px] font-black text-ink/55">
            <CalendarDays size={15} className="text-pink" aria-hidden="true" />
            {template === "fan-studio"
              ? "キャラクターが縦、1週間の日付が横に並びます"
              : template === "fan-studio-daily"
                ? "時間が縦、予定のある部屋だけが横に並びます"
              : "選択したイベントが画像の横軸に並びます"}
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
        {template === "overview" && selectedEvents.length === 0 && (
          <p className="mt-3 text-[11px] font-bold text-[#b65364]">
            画像に載せるイベントを1つ以上選んでください。
          </p>
        )}
        {template === "fan-studio" && activeFanStudioRows.length === 0 && (
          <p className="mt-3 text-[11px] font-bold text-[#b65364]">
            この週に表示できるファンスタジオのキャラクターがいません。
          </p>
        )}
        {template === "fan-studio-daily" && activeDailyFanStudio.rows.length === 0 && (
          <p className="mt-3 text-[11px] font-bold text-[#b65364]">
            この日に表示できるファンスタジオ予定がありません。
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
            key={`${period.id}-${template}-${themeKey}-${selectedEvents.join("|")}-${normalizedSpecialLegend}-${normalizedSpecialEmoji}-${normalizedSpecialEmojiMeaning}`}
            ref={(node) => {
              if (node) captureRefs.current.set(period.id, node);
              else captureRefs.current.delete(period.id);
            }}
          >
            {template === "fan-studio-daily" ? (
              <DailyFanStudioInstagramCard
                date={period.start}
                entries={scheduleState.entries}
                theme={theme}
                specialEmoji={normalizedSpecialEmoji}
                specialEmojiMeaning={normalizedSpecialEmojiMeaning}
              />
            ) : template === "fan-studio" ? (
              <FanStudioInstagramCard
                period={period}
                entries={scheduleState.entries}
                characters={characterState.characters}
                theme={theme}
                specialLegend={normalizedSpecialLegend}
                targetMonth={mode === "month" ? selectedMonth : undefined}
                pageIndex={index}
                pageCount={periods.length}
              />
            ) : (
              <ScheduleInstagramCard
                period={period}
                entries={filteredEntries}
                eventNames={selectedEvents}
                theme={theme}
                targetMonth={mode === "month" ? selectedMonth : undefined}
                pageIndex={index}
                pageCount={periods.length}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
