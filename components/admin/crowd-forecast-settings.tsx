"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleAlert, Eye, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import {
  LEVEL_LABELS,
  type ForecastConfig,
  type ForecastState,
  type Period,
  type Publication,
  type WeatherKind,
} from "@/lib/crowd-forecast/types";
import { formatForecastTime } from "@/components/crowd-forecast/weather";
import { japanDay } from "@/lib/crowd-forecast/date";
import { displayedScore } from "@/lib/crowd-forecast/score";
import { CrowdDailyAdjustments } from "@/components/admin/crowd-daily-adjustments";
import {
  expandDailyAdjustments,
  groupDailyAdjustments,
  type DailyAdjustment,
} from "@/lib/crowd-forecast/daily-adjustments";

type Character = {
  id: string;
  name: string;
  birthdayMonth: number | null;
  birthdayDay: number | null;
};
type ResponseData = {
  state: ForecastState;
  revision: number;
  characters: Character[];
  lastAttempt: string | null;
  running: boolean;
};
const field =
  "min-h-10 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-pink focus:ring-1 focus:ring-pink disabled:opacity-50";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-pink/25 bg-white px-4 py-2 text-xs font-bold text-pink disabled:opacity-40";
const card = "rounded-2xl border border-pink/15 bg-white p-4 sm:p-5";
const weatherLabels: Record<WeatherKind, string> = {
  clear: "晴れ",
  cloud: "くもり",
  occasionalRain: "一時・時々雨",
  mixedRain: "晴雨混在",
  rain: "雨中心",
  heavyRain: "長時間の大雨（手動判断）",
};
const publicationLabels: Record<Publication, string> = {
  published: "公開済み（実施なしも確認済み）",
  unpublished: "未公開",
  unconfirmed: "確認中",
  failed: "取得失敗",
};
const tabs = [
  "基本・天気",
  "誕生日",
  "期間・公開状況",
  "日別調整",
  "プレビュー・履歴",
];
async function api(action: string, data: object = {}) {
  const r = await fetch("/api/admin/crowd-forecast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || "更新に失敗しました。");
  return body;
}
function NumberField({
  label,
  value,
  set,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block text-xs font-bold leading-6 text-ink/65">
      {label}
      <input
        type="number"
        required
        className={field}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => set(e.currentTarget.valueAsNumber)}
      />
    </label>
  );
}
function removeButton(remove: () => void, label: string) {
  return (
    <button
      type="button"
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-ink/45 hover:bg-red-50 hover:text-red-600"
      aria-label={`${label}を削除`}
      onClick={remove}
    >
      <Trash2 size={16} />
    </button>
  );
}
export function CrowdForecastSettings() {
  const [dailyAdjustments, setDailyAdjustments] = useState<DailyAdjustment[]>([]);
  const [data, setData] = useState<ResponseData | null>(null),
    [config, setConfig] = useState<ForecastConfig | null>(null);
  const [preview, setPreview] = useState<ForecastState | null>(null),
    [previewKey, setPreviewKey] = useState("");
  const [tab, setTab] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [previewMonth, setPreviewMonth] = useState(() =>
    japanDay().slice(0, 7),
  );
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/admin/crowd-forecast", {
        cache: "no-store",
        signal,
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "設定を読み込めませんでした。");
      setData(body);
      setConfig(body.state.config);
      setDailyAdjustments(groupDailyAdjustments(body.state.config.overrides));
      setPreview(null);
      setPreviewKey("");
      setError("");
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);
  function update(change: (c: ForecastConfig) => void) {
    if (!config) return;
    const next = structuredClone(config);
    change(next);
    setConfig(next);
    setMessage("");
  }
  async function act(action: "preview" | "save" | "refresh") {
    if (!config || !data) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api(action, { config, revision: data.revision });
      if (action === "preview") {
        setPreview(response.state);
        setPreviewKey(JSON.stringify(config));
        setTab(4);
        setMessage("未保存の予想です。内容を確認して保存してください。");
      } else {
        await load();
        setMessage(
          action === "save"
            ? "設定と予想を保存しました。"
            : response.skipped
              ? response.reason
              : "天気を取得し、翌日以降の予想を更新しました。",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  if (!data || !config)
    return (
      <div className={card}>
        {error ? (
          <>
            <p role="alert" className="text-sm leading-7 text-red-700">
              {error}
            </p>
            <button className={`${button} mt-4`} onClick={() => void load()}>
              再読み込み
            </button>
          </>
        ) : (
          <p className="text-sm text-ink/60">設定を読み込んでいます…</p>
        )}
      </div>
    );
  const numericGroups = [
    {
      title: "曜日の基準点",
      key: "weekday" as const,
      labels: {
        normal: "通常の平日",
        adjacent: "土日祝前後の平日",
        saturday: "土曜日",
        sunday: "日曜日",
        holiday: "祝日・振替休日",
      },
    },
    {
      title: "連休の加点",
      key: "holiday" as const,
      labels: {
        three: "3連休",
        four: "4連休",
        five: "5連休",
        six: "6連休以上",
        edgeReduction: "初日・最終日の減点",
        cap: "連休・学校休暇の合計上限",
      },
    },
    {
      title: "営業時間の加点",
      key: "hours" as const,
      labels: {
        eight: "8時間以上・9時間未満",
        nine: "9時間以上・10時間未満",
        ten: "10時間以上・11時間未満",
        eleven: "11時間以上",
      },
    },
    {
      title: "イベントの加点",
      key: "event" as const,
      labels: {
        boundary: "開始日・終了日",
        weekend: "初週・最終週の土日",
        cap: "イベント加点の上限",
      },
    },
    {
      title: "混雑レベルの境界（以上）",
      key: "thresholds" as const,
      labels: {
        normal: "普通",
        moderate: "やや混雑",
        busy: "混雑",
        veryBusy: "大混雑",
      },
    },
  ];
  const periodFields = <T extends Period>(
    p: T,
    change: (v: Partial<T>) => void,
  ) => (
    <>
      <label className="text-xs text-ink/65">
        名称
        <input
          className={field}
          value={p.name}
          maxLength={80}
          onChange={(e) => change({ name: e.target.value } as Partial<T>)}
        />
      </label>
      <label className="text-xs text-ink/65">
        開始日
        <input
          className={field}
          type="date"
          value={p.from}
          onChange={(e) => change({ from: e.target.value } as Partial<T>)}
        />
      </label>
      <label className="text-xs text-ink/65">
        終了日
        <input
          className={field}
          type="date"
          value={p.to}
          onChange={(e) => change({ to: e.target.value } as Partial<T>)}
        />
      </label>
    </>
  );
  const initialPeriod = () => ({
    id: crypto.randomUUID(),
    name: "",
    from: "",
    to: "",
  });
  const allPreviewDays = Object.values(preview?.days ?? data.state.days).sort(
    (a, b) => a.input.date.localeCompare(b.input.date),
  );
  const previewDays = allPreviewDays.filter((d) =>
    d.input.date.startsWith(previewMonth),
  );
  const fresh = preview && previewKey === JSON.stringify(config);
  return (
    <div className="space-y-5">
      <div
        className={`${card} flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="text-xs leading-6 text-ink/60">
          <p>最終公開更新：{formatForecastTime(data.state.updatedAt)}</p>
          <p>
            天気取得日：{data.lastAttempt || "未取得"} ／
            毎日19時ごろ、翌日以降のみ更新
          </p>
          <p>祝日データ：{data.state.holidayThrough}年まで（内閣府）</p>
        </div>
        <Link href="/crowd-forecast" target="_blank" className={button}>
          公開ページを見る
        </Link>
      </div>
      {data.state.error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          {data.state.error}
        </p>
      )}
      <div
        role="tablist"
        aria-label="混雑予想の設定項目"
        className="flex flex-wrap gap-2"
      >
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === i}
            aria-controls={`forecast-panel-${i}`}
            id={`forecast-tab-${i}`}
            tabIndex={tab === i ? 0 : -1}
            onKeyDown={(e) => {
              const n =
                e.key === "ArrowRight"
                  ? (i + 1) % tabs.length
                  : e.key === "ArrowLeft"
                    ? (i + tabs.length - 1) % tabs.length
                    : null;
              if (n !== null) {
                e.preventDefault();
                setTab(n);
                document.getElementById(`forecast-tab-${n}`)?.focus();
              }
            }}
            onClick={() => setTab(i)}
            className={`${button} ${tab === i ? "!bg-pink !text-white" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>
      <fieldset disabled={busy || data.running} className="min-w-0 space-y-5">
        <div
          role="tabpanel"
          id={`forecast-panel-${tab}`}
          aria-labelledby={`forecast-tab-${tab}`}
          className="space-y-5"
        >
          {tab === 0 && (
            <>
              <div className={card}>
                <h2 className="mb-3 text-sm font-black">公開範囲</h2>
                <div className="max-w-xs">
                  <NumberField
                    label="当月を含む公開月数"
                    value={config.months}
                    min={1}
                    max={6}
                    set={(n) =>
                      update((c) => {
                        c.months = n;
                      })
                    }
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-ink/50">
                  過去月は表示・保存しません。当月内の過ぎた日の予想は書き換えません。当日は日別調整を保存した場合のみ再計算します。
                </p>
              </div>
              {numericGroups.map((group) => (
                <div className={card} key={group.key}>
                  <h2 className="mb-3 text-sm font-black">{group.title}</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {Object.entries(group.labels).map(([key, label]) => (
                      <NumberField
                        key={key}
                        label={label}
                        value={
                          (config[group.key] as Record<string, number>)[key]
                        }
                        set={(n) =>
                          update((c) => {
                            (c[group.key] as Record<string, number>)[key] = n;
                          })
                        }
                      />
                    ))}
                  </div>
                  {group.key === "hours" && (
                    <p className="mt-3 text-xs leading-6 text-ink/50">
                      8時間未満は加点なし。該当する1段階のみ適用し、ファンスタ回数の加点と大きい方を使います。
                    </p>
                  )}
                  {group.key === "event" && (
                    <p className="mt-3 text-xs leading-6 text-ink/50">
                      通常の開催期間中は加点しません。同じ日・同じイベントの重複は最大値を使います。
                    </p>
                  )}
                </div>
              ))}
              <div className={card}>
                <h2 className="mb-3 text-sm font-black">
                  ファンスタの比較と表示
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <NumberField
                    label="高加点になる基準回数の倍率"
                    step={0.1}
                    min={1}
                    max={10}
                    value={config.fan.highRatio}
                    set={(n) =>
                      update((c) => {
                        c.fan.highRatio = n;
                      })
                    }
                  />
                  <NumberField
                    label="基準回数以上の加点"
                    value={config.fan.medium}
                    set={(n) =>
                      update((c) => {
                        c.fan.medium = n;
                      })
                    }
                  />
                  <NumberField
                    label="高加点の点数"
                    value={config.fan.high}
                    set={(n) =>
                      update((c) => {
                        c.fan.high = n;
                      })
                    }
                  />
                  <label className="text-xs font-bold leading-6 text-ink/65">
                    比較基準日
                    <input
                      className={field}
                      type="date"
                      value={config.fan.baselineDate}
                      onChange={(e) =>
                        update((c) => {
                          c.fan.baselineDate = e.target.value;
                        })
                      }
                    />
                  </label>
                  <NumberField
                    label="加点・3部屋表示の基準回数"
                    min={1}
                    max={1000}
                    value={config.fan.baselineSlots}
                    set={(n) =>
                      update((c) => {
                        c.fan.baselineSlots = n;
                      })
                    }
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-ink/50">
                  公開済みの1日の回数が基準回数以上なら加点し、設定倍率以上なら高加点の点数を使います。営業時間や過去の開催実績では割りません。同室・同時刻の複数キャラクターは1回。3部屋を使用し、回数が基準を超える場合だけ「ファンスタ3部屋」と表示します。
                </p>
              </div>
              <div className={card}>
                <h2 className="mb-3 text-sm font-black">天気の係数</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {Object.entries(weatherLabels).map(([key, label]) => (
                    <NumberField
                      key={key}
                      label={label}
                      step={0.01}
                      max={1}
                      value={config.weather[key as WeatherKind]}
                      set={(n) =>
                        update((c) => {
                          c.weather[key as WeatherKind] = n;
                        })
                      }
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs leading-6 text-ink/50">
                  2日先まで全量、3〜6日先は影響を半分にし、7日先以降は補正しません。誕生日も同じ係数です。降水確率だけで大雨と判定しません。
                </p>
              </div>
            </>
          )}
          {tab === 1 && (
            <div className={card}>
              <h2 className="mb-3 text-sm font-black">キャラクターの誕生日</h2>
              <p className="my-3 text-xs leading-6 text-ink/50">
                キャラクターごとに誕生日の加点を設定できます。誕生日はキャラクター台帳を参照します。未評価は暫定0点。複数の誕生日が重なった場合は最大値を使います。
              </p>
              {data.characters.length > 0 ? (
                <ul
                  className="grid max-h-[500px] gap-2 overflow-y-auto pr-1 lg:grid-cols-2"
                  aria-label="キャラクター別の誕生日加点"
                >
                  {data.characters.map((c) => (
                    <li
                      key={c.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-pink/10 bg-[#fffdfd] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-bold">{c.name}</p>
                        <p className="mt-1 text-xs text-ink/50">
                          {c.birthdayMonth && c.birthdayDay
                            ? `誕生日：${c.birthdayMonth}/${c.birthdayDay}`
                            : "誕生日未登録"}
                        </p>
                      </div>
                      <label className="block w-40 max-w-[50%] shrink-0 text-xs text-ink/65">
                        誕生日の加点
                        <select
                          className={`${field} mt-1 min-h-11`}
                          aria-label={`${c.name}の誕生日加点`}
                          value={
                            config.birthdays[c.id] ??
                            (c.name === "クロミ" ? 10 : "")
                          }
                          onChange={(e) =>
                            update((v) => {
                              if (e.target.value === "") delete v.birthdays[c.id];
                              else
                                v.birthdays[c.id] = Number(e.target.value) as
                                  0 | 5 | 10;
                            })
                          }
                        >
                          <option value="">未評価（暫定0）</option>
                          {[0, 5, 10].map((n) => (
                            <option key={n} value={n}>
                              {n}点
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-pink/20 p-6 text-center text-xs text-ink/50">
                  登録済みのキャラクターがいません。
                </p>
              )}
              <p className="mt-3 text-xs leading-6 text-ink/50">
                名前・誕生日の登録や変更は
                <Link href="/admin/characters" className="ml-1 font-bold text-pink underline underline-offset-4">
                  キャラクター管理
                </Link>
                で行えます。
              </p>
            </div>
          )}
          {tab === 2 && (
            <>
              <div className={card}>
                <h2 className="text-sm font-black">イベントの開始・終了</h2>
                <p className="my-3 text-xs leading-6 text-ink/50">
                  開催初日・最終日と、最初・最後の土日のみ補正します。ハロウィンなどの開催期間全体への加点はありません。
                </p>
                {config.events.map((p, i) => (
                  <div
                    key={p.id}
                    className="mb-4 grid items-end gap-3 rounded-xl bg-pink/[.03] p-3 sm:grid-cols-[1fr_150px_150px_40px]"
                  >
                    {periodFields(p, (v) =>
                      update((c) => {
                        Object.assign(c.events[i], v);
                      }),
                    )}
                    {removeButton(
                      () =>
                        update((c) => {
                          c.events.splice(i, 1);
                        }),
                      p.name || "イベント",
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={`${button} mt-3`}
                  onClick={() =>
                    update((c) => {
                      c.events.push(initialPeriod());
                    })
                  }
                >
                  <Plus size={15} />
                  イベントを追加
                </button>
              </div>
              <div className={card}>
                <h2 className="mb-3 text-sm font-black">
                  学校休暇・特別な休暇期間
                </h2>
                {config.vacations.map((p, i) => (
                  <div
                    key={p.id}
                    className="mb-4 grid items-end gap-3 rounded-xl bg-pink/[.03] p-3 sm:grid-cols-3"
                  >
                    {periodFields(p, (v) =>
                      update((c) => {
                        Object.assign(c.vacations[i], v);
                      }),
                    )}
                    <NumberField
                      label="加点"
                      value={p.points}
                      set={(n) =>
                        update((c) => {
                          c.vacations[i].points = n;
                        })
                      }
                    />
                    {removeButton(
                      () =>
                        update((c) => {
                          c.vacations.splice(i, 1);
                        }),
                      p.name || "休暇",
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    update((c) => {
                      c.vacations.push({ ...initialPeriod(), points: 5 });
                    })
                  }
                >
                  <Plus size={15} />
                  休暇期間を追加
                </button>
              </div>
              <div className={card}>
                <h2 className="text-sm font-black">スケジュールの公開状況</h2>
                <p className="my-3 text-xs leading-6 text-ink/50">
                  承認済みの予定が存在する日は公開済みとして扱います。予定がない日は未確認です。公式に実施なしと確認した日も、ここで公開済みにできます。重なる期間は下の設定が優先されます。
                </p>
                {config.publications.map((p, i) => (
                  <div
                    key={p.id}
                    className="mb-4 grid items-end gap-3 rounded-xl bg-pink/[.03] p-3 sm:grid-cols-3"
                  >
                    {periodFields(p, (v) =>
                      update((c) => {
                        Object.assign(c.publications[i], v);
                      }),
                    )}
                    {(["schedule", "fan"] as const).map((key) => (
                      <label className="text-xs text-ink/65" key={key}>
                        {key === "schedule" ? "スケジュール" : "ファンスタ"}
                        <select
                          className={field}
                          value={p[key]}
                          onChange={(e) =>
                            update((c) => {
                              c.publications[i][key] = e.target
                                .value as Publication;
                            })
                          }
                        >
                          {Object.entries(publicationLabels).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    {removeButton(
                      () =>
                        update((c) => {
                          c.publications.splice(i, 1);
                        }),
                      p.name || "公開状況",
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    update((c) => {
                      c.publications.push({
                        ...initialPeriod(),
                        schedule: "unconfirmed",
                        fan: "unconfirmed",
                      });
                    })
                  }
                >
                  <Plus size={15} />
                  公開状況を追加
                </button>
              </div>
            </>
          )}
          {tab === 3 && (
            <CrowdDailyAdjustments
              groups={dailyAdjustments}
              onChange={(groups) => {
                setDailyAdjustments(groups);
                update((c) => {
                  c.overrides = expandDailyAdjustments(groups);
                });
              }}
            />
          )}
          {tab === 4 && (
            <>
              <div className={card}>
                <h2 className="text-sm font-black">
                  {preview ? "未保存のプレビュー" : "現在公開中の予想"}
                </h2>
                {preview && !fresh && (
                  <p className="mt-3 text-xs text-amber-800">
                    設定が変更されています。もう一度プレビューしてください。
                  </p>
                )}
                <label className="mt-4 block max-w-xs text-xs text-ink/65">
                  確認する月
                  <select
                    className={field}
                    value={previewMonth}
                    onChange={(e) => setPreviewMonth(e.target.value)}
                  >
                    {[
                      ...new Set(
                        allPreviewDays.map((d) => d.input.date.slice(0, 7)),
                      ),
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-4 max-h-[480px] overflow-auto">
                  <table className="w-full whitespace-nowrap text-left text-xs">
                    <thead className="sticky top-0 border-b border-pink/20 bg-white text-ink/50">
                      <tr>
                        {[
                          "日付",
                          "混雑度",
                          "点数",
                          "曜日",
                          "連休等",
                          "イベント",
                          "営業時間",
                          "ファンスタ",
                          "誕生日",
                          "調整",
                          "天気係数",
                          "丸め前",
                        ].map((t) => (
                          <th key={t} className="px-2 py-3">
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewDays.map((d) => (
                        <tr
                          key={d.input.date}
                          className="border-b border-pink/10"
                        >
                          <td className="px-2 py-3">{d.input.date}</td>
                          <td className="px-2">
                            {LEVEL_LABELS[d.level]}
                            {d.provisional ? "（基本予想）" : ""}
                          </td>
                          <td className="px-2 font-bold">
                            {displayedScore(d) ?? "—"}
                          </td>
                          {[
                            "weekday",
                            "calendar",
                            "event",
                            "hours",
                            "fan",
                            "birthday",
                            "manual",
                          ].map((k) => (
                            <td key={k} className="px-2">
                              {d.breakdown[k]}
                            </td>
                          ))}
                          <td className="px-2">{d.factor.toFixed(3)}</td>
                          <td className="px-2">{d.raw?.toFixed(1) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!previewDays.length && (
                    <p className="py-6 text-sm text-ink/50">
                      まだ予想はありません。プレビューを実行してください。
                    </p>
                  )}
                </div>
                <p className="mt-4 text-xs leading-6 text-ink/50">
                  点数は100点を超えてもそのまま表示します（小数点以下は四捨五入、0点未満は0点）。営業時間とファンスタ加点は大きい方だけ適用します。未公開の予定は反映しない基本予想とし、固定レベル・休園・営業状況未確認の日は点数を表示しません。
                </p>
              </div>
              <div className={card}>
                <h2 className="mb-3 text-sm font-black">設定履歴</h2>
                <p className="mb-3 text-xs leading-6 text-ink/50">
                  戻した設定もプレビューしてから保存します。過去日の予想は書き換えません。
                </p>
                {data.state.history.map((h, i) => (
                  <div
                    key={`${h.at}-${i}`}
                    className="flex items-center justify-between gap-4 border-t border-pink/10 py-3 text-xs"
                  >
                    <span>{formatForecastTime(h.at)}以前の設定</span>
                    <button
                      className={button}
                      type="button"
                      onClick={() => {
                        setConfig(structuredClone(h.config));
                        setDailyAdjustments(groupDailyAdjustments(h.config.overrides));
                        setPreview(null);
                        setPreviewKey("");
                        setMessage(
                          "履歴の設定を入力欄に戻しました。プレビュー後に保存してください。",
                        );
                      }}
                    >
                      この設定を読み込む
                    </button>
                  </div>
                ))}
              </div>
              <div className={card}>
                <h2 className="mb-2 text-sm font-black">天気取得・初回更新</h2>
                <p className="mb-4 text-xs leading-6 text-ink/50">
                  気象庁からの取得は1日1回です。実行すると、その日の19時の取得も実行済みとして扱います。設定の保存やページ表示では取得しません。
                </p>
                <button
                  className={button}
                  type="button"
                  onClick={() => void act("refresh")}
                  disabled={
                    !!data.lastAttempt &&
                    data.lastAttempt ===
                      new Intl.DateTimeFormat("sv-SE", {
                        timeZone: "Asia/Tokyo",
                      }).format(new Date())
                  }
                >
                  <RefreshCw size={15} />
                  本日分の天気取得と更新
                </button>
              </div>
            </>
          )}
        </div>
      </fieldset>
      <div className="sticky bottom-3 z-10 rounded-2xl border border-pink/20 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-6 text-ink/55">
            保存前に対象日の予想をご確認ください。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={button}
              disabled={busy || data.running}
              onClick={() => void act("preview")}
            >
              <Eye size={15} />
              {busy ? "処理中…" : "プレビュー"}
            </button>
            <button
              type="button"
              className={`${button} !bg-pink !text-white`}
              disabled={busy || data.running || !fresh}
              onClick={() => void act("save")}
            >
              <Save size={15} />
              設定を保存
            </button>
          </div>
        </div>
        {error && (
          <p
            className="mt-3 flex items-start gap-2 text-xs leading-6 text-red-700"
            role="alert"
          >
            <CircleAlert size={16} className="mt-1 shrink-0" />
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 text-xs leading-6 text-ink/65" role="status">
            {message}
          </p>
        )}
        {data.running && (
          <p className="mt-3 text-xs text-amber-900">
            定期更新中です。しばらくしてから再読み込みしてください。
          </p>
        )}
      </div>
    </div>
  );
}
