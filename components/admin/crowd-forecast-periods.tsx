"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { ForecastConfig, Period, Publication } from "@/lib/crowd-forecast/types";

type PeriodSettings = Pick<ForecastConfig, "events" | "vacations" | "publications">;
const field = "min-h-11 min-w-0 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-pink focus:ring-1 focus:ring-pink disabled:opacity-50";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-pink/25 bg-white px-3 py-2 text-xs font-bold text-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink disabled:opacity-40";
const publicationLabels: Record<Publication, string> = {
  published: "公開済み（実施なしも確認済み）",
  unpublished: "未公開",
  unconfirmed: "確認中",
  failed: "取得失敗",
};
const publicationSummary: Record<Publication, string> = {
  ...publicationLabels,
  published: "公開済み",
};

function periodSummary({ from, to }: Period) {
  const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  if (!from || !to) return `${from ? from.replaceAll("-", "/") : "開始日未設定"}～${to ? to.replaceAll("-", "/") : "終了日未設定"}`;
  if (from === to) return `${from.slice(0, 4)}年${shortDate(from)}`;
  return `${from.slice(0, 4)}年${shortDate(from)}～${from.slice(0, 4) === to.slice(0, 4) ? "" : `${to.slice(0, 4)}年`}${shortDate(to)}`;
}

function PeriodSection<T extends Period>({
  kind, title, addLabel, itemLabel, description, items, openKey, setOpenKey,
  onAdd, onChange, onRemove, summary, extraFields,
}: {
  kind: string;
  title: string;
  addLabel: string;
  itemLabel: string;
  description?: string;
  items: T[];
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  onAdd: () => void;
  onChange: (item: T) => void;
  onRemove: (id: string) => void;
  summary?: (item: T) => ReactNode;
  extraFields?: (item: T, change: (patch: Partial<T>) => void) => ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-2xl border border-pink/15 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black">{title}</h2>
        <button type="button" className={button} onClick={onAdd}>
          <Plus size={15} />{addLabel}
        </button>
      </div>
      {description && <p className="mt-3 text-xs leading-6 text-ink/50">{description}</p>}
      <div className="mt-4 space-y-2">
        {!items.length && <p className="rounded-xl bg-pink/[.03] p-4 text-xs leading-6 text-ink/55">{itemLabel}はまだありません。上部のボタンから追加できます。</p>}
        {/* Display newest first without mutating the stored precedence order. */}
        {items.slice().reverse().map((item) => {
          const key = `${kind}-${item.id}`;
          const panelId = `crowd-period-${key}`;
          const open = openKey === key;
          const change = (patch: Partial<T>) => onChange({ ...item, ...patch });
          return (
            <div key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-pink/15 bg-pink/[.03]">
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink sm:p-4"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenKey(open ? null : key)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-bold text-ink">{item.name.trim() || `新しい${itemLabel}`}</span>
                  <span className="mt-1 block break-words text-xs leading-5 text-ink/60">{periodSummary(item)}</span>
                  {summary && <span className="mt-1 block break-words text-xs leading-5 text-ink/60">{summary(item)}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-pink">
                  {open ? "閉じる" : "編集"}<ChevronDown size={16} className={open ? "rotate-180" : ""} />
                </span>
              </button>
              {open && (
                <div id={panelId} className="space-y-4 border-t border-pink/10 p-3 sm:p-4">
                  <div className="grid min-w-0 items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="min-w-0 text-xs leading-6 text-ink/65 sm:col-span-2 xl:col-span-1">名称
                      <input className={field} value={item.name} maxLength={80} onChange={(event) => change({ name: event.target.value } as Partial<T>)} />
                    </label>
                    <label className="min-w-0 text-xs leading-6 text-ink/65">開始日
                      <input className={field} type="date" required value={item.from} max={item.to || undefined} onChange={(event) => change({ from: event.target.value } as Partial<T>)} />
                    </label>
                    <label className="min-w-0 text-xs leading-6 text-ink/65">終了日
                      <input className={field} type="date" required value={item.to} min={item.from || undefined} onChange={(event) => change({ to: event.target.value } as Partial<T>)} />
                    </label>
                    {extraFields?.(item, change)}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" onClick={() => {
                      onRemove(item.id);
                      setOpenKey(null);
                    }}>
                      <Trash2 size={15} />この{itemLabel}を削除
                    </button>
                    <button type="button" className={button} onClick={() => setOpenKey(null)}>編集を閉じる</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CrowdForecastPeriods({ config, onChange }: {
  config: PeriodSettings;
  onChange: (change: Partial<PeriodSettings>) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  function initialPeriod(): Period {
    return { id: crypto.randomUUID(), name: "", from: "", to: "" };
  }
  return (
    <>
      <p className="text-xs leading-6 text-ink/55">編集する項目を選ぶと開きます。新しい項目は各欄の上部から追加できます。</p>
      <PeriodSection
        kind="event" title="イベントの開始・終了" itemLabel="イベント" addLabel="イベントを追加"
        description="開催初日・最終日と、最初・最後の土日のみ補正します。ハロウィンなどの開催期間全体への加点はありません。"
        items={config.events} openKey={openKey} setOpenKey={setOpenKey}
        onAdd={() => {
          const item = initialPeriod();
          onChange({ events: [...config.events, item] });
          setOpenKey(`event-${item.id}`);
        }}
        onChange={(item) => onChange({ events: config.events.map((p) => p.id === item.id ? item : p) })}
        onRemove={(id) => onChange({ events: config.events.filter((p) => p.id !== id) })}
      />
      <PeriodSection
        kind="vacation" title="学校休暇・特別な休暇期間" itemLabel="休暇期間" addLabel="休暇期間を追加"
        items={config.vacations} openKey={openKey} setOpenKey={setOpenKey}
        onAdd={() => {
          const item = { ...initialPeriod(), points: 5 };
          onChange({ vacations: [...config.vacations, item] });
          setOpenKey(`vacation-${item.id}`);
        }}
        onChange={(item) => onChange({ vacations: config.vacations.map((p) => p.id === item.id ? item : p) })}
        onRemove={(id) => onChange({ vacations: config.vacations.filter((p) => p.id !== id) })}
        summary={(item) => `加点：${item.points || 0}点`}
        extraFields={(item, change) => (
          <label className="min-w-0 text-xs font-bold leading-6 text-ink/65">加点
            <input className={field} type="number" required min={0} max={100} step={1} value={Number.isNaN(item.points) ? "" : item.points} onChange={(event) => change({ points: event.currentTarget.valueAsNumber })} />
          </label>
        )}
      />
      <PeriodSection
        kind="publication" title="スケジュールの公開状況" itemLabel="公開状況" addLabel="公開状況を追加"
        description="承認済みの予定が存在する日は公開済みとして扱います。予定がない日は未確認です。公式に実施なしと確認した日も、ここで公開済みにできます。重なる期間は一覧の上にある設定が優先されます。"
        items={config.publications} openKey={openKey} setOpenKey={setOpenKey}
        onAdd={() => {
          const item = { ...initialPeriod(), schedule: "unconfirmed" as const, fan: "unconfirmed" as const };
          onChange({ publications: [...config.publications, item] });
          setOpenKey(`publication-${item.id}`);
        }}
        onChange={(item) => onChange({ publications: config.publications.map((p) => p.id === item.id ? item : p) })}
        onRemove={(id) => onChange({ publications: config.publications.filter((p) => p.id !== id) })}
        summary={(item) => `スケジュール：${publicationSummary[item.schedule]} ・ ファンスタ：${publicationSummary[item.fan]}`}
        extraFields={(item, change) => (["schedule", "fan"] as const).map((key) => (
          <label className="min-w-0 text-xs leading-6 text-ink/65" key={key}>{key === "schedule" ? "スケジュール" : "ファンスタ"}
            <select className={field} value={item[key]} onChange={(event) => change({ [key]: event.target.value as Publication } as Partial<typeof item>)}>
              {Object.entries(publicationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        ))}
      />
    </>
  );
}
