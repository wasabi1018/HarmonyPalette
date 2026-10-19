"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { addDays, formatDateRanges, japanDay, weekday } from "@/lib/crowd-forecast/date";
import type { DailyAdjustment } from "@/lib/crowd-forecast/daily-adjustments";
import { LEVELS, LEVEL_LABELS, type WeatherKind } from "@/lib/crowd-forecast/types";

const field = "min-h-11 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-pink focus:ring-1 focus:ring-pink disabled:opacity-50";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-pink/25 bg-white px-3 py-2 text-xs font-bold text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink disabled:opacity-40";
const weatherLabels: Record<WeatherKind, string> = {
  clear: "晴れ",
  cloud: "くもり",
  occasionalRain: "一時・時々雨",
  mixedRain: "晴雨混在",
  rain: "雨中心",
  heavyRain: "長時間の大雨（手動判断）",
};

function dateSummary(dates: string[]) {
  if (!dates.length) return "日付を選択してください";
  return dates[0].slice(0, 4) === dates.at(-1)!.slice(0, 4)
    ? `${dates[0].slice(0, 4)}年 ${formatDateRanges(dates)}`
    : dates.map((date) => date.replaceAll("-", "/")).join("、");
}

function AdjustmentDates({
  dates,
  reservedDates,
  onChange,
}: {
  dates: string[];
  reservedDates: Set<string>;
  onChange: (dates: string[]) => void;
}) {
  const [month, setMonth] = useState(() => (dates[0] || japanDay()).slice(0, 7));
  const first = `${month}-01`;
  const nextMonth = addDays(`${month}-28`, 4).slice(0, 7);
  const days = Number(addDays(`${nextMonth}-01`, -1).slice(8));
  const selected = new Set(dates);
  function moveMonth(direction: number) {
    const value = new Date(`${first}T00:00:00Z`);
    value.setUTCMonth(value.getUTCMonth() + direction);
    setMonth(value.toISOString().slice(0, 7));
  }
  return (
    <fieldset className="min-w-0 rounded-xl border border-pink/15 bg-white p-3">
      <legend className="px-1 text-xs font-bold text-ink/65">対象日（複数選択可）</legend>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className={button} aria-label="前の月" onClick={() => moveMonth(-1)}>
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold text-ink/75" aria-live="polite">
          {Number(month.slice(0, 4))}年{Number(month.slice(5))}月
        </p>
        <button type="button" className={button} aria-label="次の月" onClick={() => moveMonth(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
        {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
          <span key={day} className="py-1 text-ink/50">{day}</span>
        ))}
        {Array.from({ length: weekday(first) }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, "0")}`;
          const active = selected.has(date);
          const reserved = reservedDates.has(date);
          const disabled = reserved || (!active && reservedDates.size + dates.length >= 400);
          return (
            <button
              key={date}
              type="button"
              aria-label={`${date.replaceAll("-", "/")}${reserved ? "（別の調整に登録済み）" : ""}`}
              aria-pressed={active}
              disabled={disabled}
              className={`min-h-11 min-w-0 rounded-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/25 ${active ? "bg-pink text-white" : "text-ink/75 hover:bg-pink/10"}`}
              onClick={() => onChange(active ? dates.filter((value) => value !== date) : [...dates, date].sort())}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <p className="mt-3 break-words text-xs leading-6 text-ink/65" aria-live="polite">
        {dates.length ? `${dates.length}日選択中：${dateSummary(dates)}` : "同じ調整を適用する日を選んでください。"}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-ink/45">もう一度押すと選択を解除できます。別の調整に登録済みの日は選択できません。</p>
    </fieldset>
  );
}

export function CrowdDailyAdjustments({
  groups,
  onChange,
}: {
  groups: DailyAdjustment[];
  onChange: (groups: DailyAdjustment[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  function changeGroup(id: string, change: Partial<DailyAdjustment>) {
    onChange(groups.map((group) => group.id === id ? { ...group, ...change } : group));
  }
  return (
    <div className="rounded-2xl border border-pink/15 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black">日別の調整</h2>
        <button type="button" className={button} onClick={() => {
          const id = crypto.randomUUID();
          onChange([{ id, dates: [], values: { points: 0, level: "", weather: "", reason: "", note: "" } }, ...groups]);
          setOpenId(id);
        }}>
          <Plus size={15} />新規追加
        </button>
      </div>
      <p className="mb-3 mt-3 text-xs leading-6 text-ink/50">同じ調整を複数日にまとめて設定できます。編集する項目を選ぶと開きます。</p>
      <p className="mb-4 text-xs leading-6 text-ink/50">当日の日別調整も保存時に反映されます。過ぎた日の予想は書き換えません。休園日を最優先し、その次に固定レベルを優先します。理由は公開されます。内部メモは管理画面のみです。</p>
      {!groups.length && <p className="rounded-xl bg-pink/[.03] p-4 text-xs leading-6 text-ink/55">日別調整はまだありません。「新規追加」から登録できます。</p>}
      <div className="space-y-2">
        {groups.map((group) => {
          const { id, dates, values } = group;
          const open = openId === id;
          const reservedDates = new Set(groups.filter((item) => item.id !== id).flatMap((item) => item.dates));
          const summary = dateSummary(dates);
          const changeValues = (change: Partial<DailyAdjustment["values"]>) => changeGroup(id, { values: { ...values, ...change } });
          return (
            <div key={id} className="min-w-0 overflow-hidden rounded-xl border border-pink/15 bg-pink/[.03]">
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink sm:p-4"
                aria-expanded={open}
                aria-controls={`daily-adjustment-${id}`}
                onClick={() => setOpenId(open ? null : id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-bold text-ink">{summary}</span>
                  <span className="mt-1 block truncate text-xs text-ink/60">{values.reason.trim() || "調整理由を入力してください"}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink/60">
                    {values.points > 0 ? "+" : ""}{values.points || 0}点
                    {values.level && ` ・ ${LEVEL_LABELS[values.level]}に固定`}
                    {values.weather && ` ・ ${weatherLabels[values.weather]}`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-pink">
                  {open ? "閉じる" : "編集"}<ChevronDown size={16} className={open ? "rotate-180" : ""} />
                </span>
              </button>
              {open && (
                <div id={`daily-adjustment-${id}`} className="space-y-4 border-t border-pink/10 p-3 sm:p-4">
                  <div className="grid items-start gap-4 lg:grid-cols-2">
                    <AdjustmentDates dates={dates} reservedDates={reservedDates} onChange={(nextDates) => changeGroup(id, { dates: nextDates })} />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <label className="text-xs font-bold leading-6 text-ink/65">加点・減点
                        <input type="number" className={field} min={-100} max={100} step={1} required value={Number.isNaN(values.points) ? "" : values.points} onChange={(event) => changeValues({ points: event.currentTarget.valueAsNumber })} />
                      </label>
                      <label className="text-xs leading-6 text-ink/65">混雑度を固定
                        <select className={field} value={values.level} onChange={(event) => changeValues({ level: event.target.value as typeof values.level })}>
                          <option value="">自動計算</option>
                          {LEVELS.map((level) => <option key={level} value={level}>{LEVEL_LABELS[level]}</option>)}
                        </select>
                      </label>
                      <label className="text-xs leading-6 text-ink/65">天気区分の調整
                        <select className={field} value={values.weather} onChange={(event) => changeValues({ weather: event.target.value as typeof values.weather })}>
                          <option value="">気象庁の予報を使用</option>
                          {Object.entries(weatherLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                  <label className="block text-xs leading-6 text-ink/65">調整理由（公開・必須）
                    <input className={field} maxLength={120} required value={values.reason} onChange={(event) => changeValues({ reason: event.target.value })} />
                  </label>
                  <label className="block text-xs leading-6 text-ink/65">内部メモ（非公開）
                    <input className={field} maxLength={500} value={values.note} onChange={(event) => changeValues({ note: event.target.value })} />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" onClick={() => {
                      onChange(groups.filter((item) => item.id !== id));
                      setOpenId(null);
                    }}>
                      <Trash2 size={15} />この調整を削除{dates.length > 1 ? `（${dates.length}日分）` : ""}
                    </button>
                    <button type="button" className={button} onClick={() => setOpenId(null)}>編集を閉じる</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
