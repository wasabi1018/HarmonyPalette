"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Clock3, CloudDownload, Database, LoaderCircle, Pencil, Rocket, TrainFront, X } from "lucide-react";

type PreviewSchedule = {
  externalKey: string;
  sourceId: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  scheduleType: string;
  location: string;
  description: string;
  characters: Array<{ name: string }>;
  confidence: number;
};

type PreviewOperation = {
  externalKey: string;
  attractionName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  operationStatus: "scheduled" | "suspended" | "limited" | "unknown";
  notes: string;
  confidence: number;
};

type PreviewOperatingDay = {
  externalKey: string;
  date: string;
  operatingStatus: "open" | "closed" | "unknown";
  openingTime?: string;
  closingTime?: string;
  sourceTitle: string;
  notes: string;
  confidence: number;
};

type ImportResult = {
  runId: string;
  rangeStart: string;
  rangeEnd: string;
  scheduleCount: number;
  operationCount: number;
  operatingDayCount: number;
  documentCount: number;
  warnings: string[];
  schedules: PreviewSchedule[];
  operations: PreviewOperation[];
  operatingDays: PreviewOperatingDay[];
  persisted: boolean;
};

type Props = {
  config: {
    canWrite: boolean;
    hasPublicKey: boolean;
    hasSecretKey: boolean;
  };
};

function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

const inputClass = "min-h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-[13px] font-bold text-ink outline-none focus:border-pink focus:ring-4 focus:ring-pink/10";
const editInputClass = "min-h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-2.5 text-[11px] font-bold text-ink outline-none focus:border-pink focus:ring-2 focus:ring-pink/10";
const IMPORT_TARGET_OPTIONS = [
  { value: "operatingDays", label: "営業情報", description: "開園・閉園・休園を取得します。" },
  { value: "dailySchedules", label: "日別スケジュール", description: "日別PDFから予定と運行情報を取得します。" },
  { value: "fanStudio", label: "ファンスタジオスケジュール", description: "ファンスタジオ画像をOCRして取得します。" },
];
const JAPANESE_NAME_COLLATOR = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

function parseCharacterNames(value: string) {
  return [...new Set(value.split(/[・,、]/).map((name) => name.trim()).filter(Boolean))];
}

export function OfficialBatchImporter({ config }: Props) {
  const today = useMemo(todayInJapan, []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [includeOperatingDays, setIncludeOperatingDays] = useState(false);
  const [includeDailySchedules, setIncludeDailySchedules] = useState(true);
  const [includeFanStudio, setIncludeFanStudio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [selectedOperatingDays, setSelectedOperatingDays] = useState<string[]>([]);
  const [editedSchedules, setEditedSchedules] = useState<string[]>([]);
  const [editedOperations, setEditedOperations] = useState<string[]>([]);
  const [editedOperatingDays, setEditedOperatingDays] = useState<string[]>([]);

  const runImport = async () => {
    setLoading(true);
    setError("");
    setFeedback("");
    setResult(null);
    try {
      const response = await fetch("/api/admin/import/official", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          includeOperatingDays,
          includeDailySchedules,
          includeFanStudio,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "公式データの取得に失敗しました。");
      const imported = body as ImportResult;
      setResult(imported);
      setSelectedSchedules(imported.schedules.map((entry) => entry.externalKey));
      setSelectedOperations(imported.operations.map((entry) => entry.externalKey));
      setSelectedOperatingDays(imported.operatingDays
        .filter((entry) => entry.operatingStatus !== "unknown")
        .map((entry) => entry.externalKey));
      setEditedSchedules([]);
      setEditedOperations([]);
      setEditedOperatingDays([]);
      setFeedback(imported.persisted
        ? "Supabaseへ確認待ちデータとして保存しました。内容を確認して公開してください。"
        : "解析は完了しましたが、Supabaseの秘密鍵が未設定のため保存していません。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "公式データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!result) return;
    setPublishing(true);
    setError("");
    try {
      const response = await fetch("/api/admin/import/official/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runId: result.runId,
          scheduleKeys: selectedSchedules,
          operationKeys: selectedOperations,
          operatingDayKeys: selectedOperatingDays,
          scheduleEdits: result.schedules
            .filter((entry) => selectedSchedules.includes(entry.externalKey))
            .map((entry) => ({
              externalKey: entry.externalKey,
              title: entry.title,
              date: entry.date,
              startTime: entry.startTime,
              endTime: entry.endTime,
              scheduleType: entry.scheduleType,
              location: entry.location,
              description: entry.description,
              characterNames: entry.characters.map((character) => character.name),
            })),
          operationEdits: result.operations
            .filter((entry) => selectedOperations.includes(entry.externalKey))
            .map((entry) => ({
              externalKey: entry.externalKey,
              attractionName: entry.attractionName,
              date: entry.date,
              startTime: entry.startTime,
              endTime: entry.endTime,
              operationStatus: entry.operationStatus,
              notes: entry.notes,
            })),
          operatingDayEdits: result.operatingDays
            .filter((entry) => selectedOperatingDays.includes(entry.externalKey))
            .map((entry) => ({
              externalKey: entry.externalKey,
              date: entry.date,
              operatingStatus: entry.operatingStatus,
              openingTime: entry.openingTime,
              closingTime: entry.closingTime,
              sourceTitle: entry.sourceTitle,
              notes: entry.notes,
            })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "公開に失敗しました。");
      setFeedback(`予定${selectedSchedules.length}件、運行情報${selectedOperations.length}件、営業情報${selectedOperatingDays.length}日を公開しました。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "公開に失敗しました。");
    } finally {
      setPublishing(false);
    }
  };

  const toggle = (key: string, values: string[], setter: (value: string[]) => void) => {
    setter(values.includes(key) ? values.filter((value) => value !== key) : [...values, key]);
  };

  const updateSchedule = (key: string, patch: Partial<PreviewSchedule>) => {
    setResult((current) => current ? {
      ...current,
      schedules: current.schedules.map((entry) => entry.externalKey === key ? { ...entry, ...patch } : entry),
    } : current);
    setEditedSchedules((current) => current.includes(key) ? current : [...current, key]);
  };

  const updateOperation = (key: string, patch: Partial<PreviewOperation>) => {
    setResult((current) => current ? {
      ...current,
      operations: current.operations.map((entry) => entry.externalKey === key ? { ...entry, ...patch } : entry),
    } : current);
    setEditedOperations((current) => current.includes(key) ? current : [...current, key]);
  };

  const updateOperatingDay = (key: string, patch: Partial<PreviewOperatingDay>) => {
    setResult((current) => current ? {
      ...current,
      operatingDays: current.operatingDays.map((entry) => entry.externalKey === key ? { ...entry, ...patch } : entry),
    } : current);
    setEditedOperatingDays((current) => current.includes(key) ? current : [...current, key]);
  };

  return (
    <section className="mb-5 rounded-[24px] border border-sky/20 bg-gradient-to-br from-[#eef8fc] via-white to-[#fff8fb] p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.16em] text-sky"><CloudDownload size={15} aria-hidden="true" />OFFICIAL BATCH IMPORT</p>
          <h2 className="mt-1 text-xl font-black text-ink">公式サイトから取得</h2>
          <p className="mt-2 max-w-2xl text-[12px] font-bold leading-6 text-ink/55">公式カレンダーから営業情報を取得し、必要に応じて日別PDFからイベント・グリーティング・アトラクション運行情報を解析します。</p>
        </div>
        <span className={`inline-flex min-h-8 items-center gap-1.5 self-start rounded-full px-3 text-[10px] font-black ${config.canWrite ? "bg-mint/15 text-[#35745f]" : "bg-[#fff4df] text-[#9a6620]"}`}><Database size={13} aria-hidden="true" />{config.canWrite ? "Supabase接続準備済み" : "Supabase秘密鍵が未設定"}</span>
      </div>

      {!config.hasSecretKey && (
        <div className="mt-4 rounded-xl border border-[#f1d59c] bg-[#fff9ec] px-3 py-3 text-[11px] font-bold leading-5 text-[#76582f]">
          <p className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><span><code>.env.local</code>にSUPABASE_SECRET_KEYを設定すると保存・公開できます。</span></p>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label><span className="mb-1.5 block text-[11px] font-black text-ink/55">開始日</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass} /></label>
        <label><span className="mb-1.5 block text-[11px] font-black text-ink/55">終了日</span><input type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} className={inputClass} /></label>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[11px] font-black text-ink/55">取込対象</legend>
        <div className="grid gap-2 md:grid-cols-3">
          {IMPORT_TARGET_OPTIONS.map((option) => {
            const checked = option.value === "operatingDays"
              ? includeOperatingDays
              : option.value === "dailySchedules"
                ? includeDailySchedules
                : includeFanStudio;
            const onChange = option.value === "operatingDays"
              ? setIncludeOperatingDays
              : option.value === "dailySchedules"
                ? setIncludeDailySchedules
                : setIncludeFanStudio;
            return (
              <label key={option.value} className={`cursor-pointer rounded-xl border p-3 transition-colors ${checked ? "border-sky bg-sky/5" : "border-ink/10 bg-white"}`}>
                <span className="flex items-start gap-2">
                  <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-sky" />
                  <span>
                    <span className="block text-[12px] font-black text-ink">{option.label}</span>
                    <span className="mt-1 block text-[10px] font-bold leading-5 text-ink/45">{option.description}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-3 flex justify-end">
        <button type="button" onClick={runImport} disabled={loading || !from || !to || !(includeOperatingDays || includeDailySchedules || includeFanStudio)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky px-5 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <CloudDownload size={16} aria-hidden="true" />}{loading ? "公式データを解析中…" : "確認待ちデータを取得"}</button>
      </div>
      {includeFanStudio && <p className="mt-2 text-[10px] font-bold leading-5 text-ink/40">ファンスタジオのOCRは時間がかかるため、最初は1日単位での取得をおすすめします。</p>}

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[11px] font-bold text-red-600">{error}</p>}
      {feedback && <p role="status" className="mt-3 rounded-xl bg-mint/10 px-3 py-2.5 text-[11px] font-bold text-[#35745f]">{feedback}</p>}

      {result && (
        <div className="mt-5 space-y-4 border-t border-sky/15 pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CountCard label="予定候補" value={result.scheduleCount} />
            <CountCard label="運行情報" value={result.operationCount} />
            <CountCard label="営業情報" value={result.operatingDayCount} />
            <CountCard label="原本保存" value={result.documentCount} />
          </div>
          {result.warnings.length > 0 && <div className="rounded-xl bg-[#fff9ec] p-3 text-[11px] font-bold leading-5 text-[#76582f]"><p className="font-black">要確認 {result.warnings.length}件</p><ul className="mt-1 list-disc pl-5">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}

          <CandidateList
            title="イベント・グリーティング"
            entries={result.schedules}
            selected={selectedSchedules}
            edited={editedSchedules}
            onToggle={(key) => toggle(key, selectedSchedules, setSelectedSchedules)}
            onChange={updateSchedule}
          />
          <OperationList
            entries={result.operations}
            selected={selectedOperations}
            edited={editedOperations}
            onToggle={(key) => toggle(key, selectedOperations, setSelectedOperations)}
            onChange={updateOperation}
          />
          <OperatingDayList
            entries={result.operatingDays}
            selected={selectedOperatingDays}
            edited={editedOperatingDays}
            onToggle={(key) => toggle(key, selectedOperatingDays, setSelectedOperatingDays)}
            onChange={updateOperatingDay}
          />

          <div className="flex flex-col gap-2 rounded-xl border border-pink/15 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] font-bold leading-5 text-ink/55">「編集」から文字列を修正できます。チェックを外した候補は公開されません。修正内容は公開時にSupabaseへ保存されます。</p><button type="button" onClick={publish} disabled={!result.persisted || publishing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{publishing ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Rocket size={16} aria-hidden="true" />}修正内容を保存して公開</button></div>
        </div>
      )}
    </section>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-white px-3 py-3 text-center"><p className="text-[10px] font-bold text-ink/40">{label}</p><p className="mt-1 text-lg font-black text-ink">{value}<span className="ml-0.5 text-[10px]">件</span></p></div>;
}

function CandidateList({ title, entries, selected, edited, onToggle, onChange }: {
  title: string;
  entries: PreviewSchedule[];
  selected: string[];
  edited: string[];
  onToggle: (key: string) => void;
  onChange: (key: string, patch: Partial<PreviewSchedule>) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"original" | "character">("original");
  const displayedEntries = useMemo(() => {
    if (sortMode === "original") return entries;
    return entries
      .map((entry, originalIndex) => ({ entry, originalIndex }))
      .sort((left, right) => {
        const leftName = left.entry.characters[0]?.name.trim() || "";
        const rightName = right.entry.characters[0]?.name.trim() || "";
        if (!leftName && rightName) return 1;
        if (leftName && !rightName) return -1;
        const compared = JAPANESE_NAME_COLLATOR.compare(leftName, rightName);
        return compared || left.originalIndex - right.originalIndex;
      })
      .map(({ entry }) => entry);
  }, [entries, sortMode]);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[13px] font-black text-ink">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-ink/40">選択中 {selected.length}/{entries.length}</span>
          <div role="group" aria-label="予定候補の並び順" className="inline-flex rounded-lg border border-ink/10 bg-white p-0.5">
            <button type="button" aria-pressed={sortMode === "original"} onClick={() => setSortMode("original")} className={`min-h-8 rounded-md px-2.5 text-[9px] font-black transition-colors ${sortMode === "original" ? "bg-pink text-white" : "text-ink/45 hover:text-pink"}`}>現在の順序</button>
            <button type="button" aria-pressed={sortMode === "character"} onClick={() => setSortMode("character")} className={`min-h-8 rounded-md px-2.5 text-[9px] font-black transition-colors ${sortMode === "character" ? "bg-pink text-white" : "text-ink/45 hover:text-pink"}`}>キャラクター名</button>
          </div>
        </div>
      </div>
      <div className="grid max-h-[620px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
        {displayedEntries.map((entry) => {
          const isSelected = selected.includes(entry.externalKey);
          const isEditing = editingKey === entry.externalKey;
          return (
            <article key={entry.externalKey} className={`min-w-0 rounded-xl border p-3 ${isSelected ? "border-pink/30 bg-white" : "border-ink/10 bg-white/50 opacity-60"}`}>
              <div className="flex min-w-0 items-start gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(entry.externalKey)} className="mt-0.5 h-4 w-4 shrink-0 accent-pink" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block min-w-0 flex-1 truncate text-[12px] font-black text-ink">{entry.title}</span>
                      {edited.includes(entry.externalKey) && <span className="shrink-0 rounded-full bg-pink/10 px-2 py-0.5 text-[8px] font-black text-pink">修正済み</span>}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-ink/45">{entry.date.replaceAll("-", "/")} {entry.startTime}{entry.endTime ? `〜${entry.endTime}` : ""}・{entry.location}</span>
                    {entry.characters.length > 0 && <span className="mt-1 block truncate text-[10px] font-bold text-pink">{entry.characters.map((character) => character.name).join("・")}</span>}
                    <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-ink/35"><Check size={10} aria-hidden="true" />解析確度 {Math.round(entry.confidence * 100)}%</span>
                  </span>
                </label>
                <button type="button" onClick={() => setEditingKey(isEditing ? null : entry.externalKey)} aria-expanded={isEditing} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-pink/15 px-2 text-[9px] font-black text-pink">
                  {isEditing ? <X size={12} aria-hidden="true" /> : <Pencil size={12} aria-hidden="true" />}{isEditing ? "閉じる" : "編集"}
                </button>
              </div>
              {isEditing && (
                <div className="mt-3 grid min-w-0 gap-2 border-t border-pink/10 pt-3 sm:grid-cols-2">
                  <EditLabel label="予定名" wide><input aria-label={`${entry.title}の予定名`} value={entry.title} onChange={(event) => onChange(entry.externalKey, { title: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="開催日"><input aria-label={`${entry.title}の開催日`} type="date" value={entry.date} onChange={(event) => onChange(entry.externalKey, { date: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="開始時間"><input aria-label={`${entry.title}の開始時間`} type="time" value={entry.startTime} onChange={(event) => onChange(entry.externalKey, { startTime: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="終了時間"><input aria-label={`${entry.title}の終了時間`} type="time" value={entry.endTime || ""} onChange={(event) => onChange(entry.externalKey, { endTime: event.target.value || undefined })} className={editInputClass} /></EditLabel>
                  <EditLabel label="開催場所"><input aria-label={`${entry.title}の開催場所`} value={entry.location} onChange={(event) => onChange(entry.externalKey, { location: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="予定種別"><input aria-label={`${entry.title}の予定種別`} value={entry.scheduleType} onChange={(event) => onChange(entry.externalKey, { scheduleType: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="キャラクター（・区切り）" wide><input aria-label={`${entry.title}のキャラクター`} value={entry.characters.map((character) => character.name).join("・")} onChange={(event) => onChange(entry.externalKey, { characters: parseCharacterNames(event.target.value).map((name) => ({ name })) })} className={editInputClass} /></EditLabel>
                  <EditLabel label="説明" wide><textarea aria-label={`${entry.title}の説明`} rows={3} value={entry.description} onChange={(event) => onChange(entry.externalKey, { description: event.target.value })} className={`${editInputClass} resize-y py-2`} /></EditLabel>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function OperationList({ entries, selected, edited, onToggle, onChange }: {
  entries: PreviewOperation[];
  selected: string[];
  edited: string[];
  onToggle: (key: string) => void;
  onChange: (key: string, patch: Partial<PreviewOperation>) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[13px] font-black text-ink"><TrainFront size={15} className="text-sky" aria-hidden="true" />アトラクション運行情報</h3>
        <span className="text-[10px] font-bold text-ink/40">選択中 {selected.length}/{entries.length}</span>
      </div>
      <div className="grid max-h-[560px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const isSelected = selected.includes(entry.externalKey);
          const isEditing = editingKey === entry.externalKey;
          return (
            <article key={entry.externalKey} className={`min-w-0 rounded-xl border p-3 ${isSelected ? "border-sky/30 bg-white" : "border-ink/10 bg-white/50 opacity-60"}`}>
              <div className="flex min-w-0 items-start gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(entry.externalKey)} className="mt-0.5 h-4 w-4 shrink-0 accent-sky" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><span className="block min-w-0 flex-1 truncate text-[11px] font-black text-ink">{entry.attractionName}</span>{edited.includes(entry.externalKey) && <span className="shrink-0 rounded-full bg-sky/10 px-2 py-0.5 text-[8px] font-black text-sky">修正済み</span>}</span>
                    <span className="mt-1 block text-[10px] font-bold text-ink/45">{entry.startTime || "時刻未定"}{entry.endTime ? `〜${entry.endTime}` : ""}</span>
                    {entry.notes && <span className="mt-1 block text-[9px] font-bold text-[#9a6620]">{entry.notes}</span>}
                  </span>
                </label>
                <button type="button" onClick={() => setEditingKey(isEditing ? null : entry.externalKey)} aria-expanded={isEditing} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-sky/20 px-2 text-[9px] font-black text-sky">
                  {isEditing ? <X size={12} aria-hidden="true" /> : <Pencil size={12} aria-hidden="true" />}{isEditing ? "閉じる" : "編集"}
                </button>
              </div>
              {isEditing && (
                <div className="mt-3 grid min-w-0 gap-2 border-t border-sky/10 pt-3 sm:grid-cols-2">
                  <EditLabel label="アトラクション名" wide><input aria-label={`${entry.attractionName}の名称`} value={entry.attractionName} onChange={(event) => onChange(entry.externalKey, { attractionName: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="運行日"><input aria-label={`${entry.attractionName}の運行日`} type="date" value={entry.date} onChange={(event) => onChange(entry.externalKey, { date: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="運行状態"><select aria-label={`${entry.attractionName}の運行状態`} value={entry.operationStatus} onChange={(event) => onChange(entry.externalKey, { operationStatus: event.target.value as PreviewOperation["operationStatus"] })} className={editInputClass}><option value="scheduled">運行予定</option><option value="suspended">運休</option><option value="limited">制限あり</option><option value="unknown">確認中</option></select></EditLabel>
                  <EditLabel label="開始時間"><input aria-label={`${entry.attractionName}の開始時間`} type="time" value={entry.startTime || ""} onChange={(event) => onChange(entry.externalKey, { startTime: event.target.value || undefined })} className={editInputClass} /></EditLabel>
                  <EditLabel label="終了時間"><input aria-label={`${entry.attractionName}の終了時間`} type="time" value={entry.endTime || ""} onChange={(event) => onChange(entry.externalKey, { endTime: event.target.value || undefined })} className={editInputClass} /></EditLabel>
                  <EditLabel label="注記" wide><textarea aria-label={`${entry.attractionName}の注記`} rows={3} value={entry.notes} onChange={(event) => onChange(entry.externalKey, { notes: event.target.value })} className={`${editInputClass} resize-y py-2`} /></EditLabel>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function OperatingDayList({ entries, selected, edited, onToggle, onChange }: {
  entries: PreviewOperatingDay[];
  selected: string[];
  edited: string[];
  onToggle: (key: string) => void;
  onChange: (key: string, patch: Partial<PreviewOperatingDay>) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  if (entries.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[13px] font-black text-ink"><Clock3 size={15} className="text-[#53a687]" aria-hidden="true" />営業情報（開園・閉園・休園）</h3>
        <span className="text-[10px] font-bold text-ink/40">選択中 {selected.length}/{entries.length}</span>
      </div>
      <div className="grid max-h-[560px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const isSelected = selected.includes(entry.externalKey);
          const isEditing = editingKey === entry.externalKey;
          const statusLabel = entry.operatingStatus === "open"
            ? `${entry.openingTime || "時刻未定"}〜${entry.closingTime || "時刻未定"}`
            : entry.operatingStatus === "closed" ? "休園日" : "確認が必要";
          return (
            <article key={entry.externalKey} className={`min-w-0 rounded-xl border p-3 ${isSelected ? "border-mint/40 bg-white" : "border-ink/10 bg-white/50 opacity-60"}`}>
              <div className="flex min-w-0 items-start gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(entry.externalKey)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#53a687]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block min-w-0 flex-1 text-[11px] font-black text-ink">{entry.date.replaceAll("-", "/")}</span>
                      {edited.includes(entry.externalKey) && <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[8px] font-black text-[#35745f]">修正済み</span>}
                    </span>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-black ${entry.operatingStatus === "closed" ? "bg-pink/10 text-pink" : entry.operatingStatus === "open" ? "bg-mint/15 text-[#35745f]" : "bg-[#fff4df] text-[#9a6620]"}`}>{statusLabel}</span>
                    {entry.notes && <span className="mt-1 block text-[9px] font-bold leading-4 text-[#9a6620]">{entry.notes}</span>}
                    <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-ink/35"><Check size={10} aria-hidden="true" />解析確度 {Math.round(entry.confidence * 100)}%</span>
                  </span>
                </label>
                <button type="button" onClick={() => setEditingKey(isEditing ? null : entry.externalKey)} aria-expanded={isEditing} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-mint/30 px-2 text-[9px] font-black text-[#35745f]">
                  {isEditing ? <X size={12} aria-hidden="true" /> : <Pencil size={12} aria-hidden="true" />}{isEditing ? "閉じる" : "編集"}
                </button>
              </div>
              {isEditing && (
                <div className="mt-3 grid min-w-0 gap-2 border-t border-mint/20 pt-3 sm:grid-cols-2">
                  <EditLabel label="営業日"><input aria-label={`${entry.date}の営業日`} type="date" value={entry.date} onChange={(event) => onChange(entry.externalKey, { date: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="営業状態"><select aria-label={`${entry.date}の営業状態`} value={entry.operatingStatus} onChange={(event) => onChange(entry.externalKey, { operatingStatus: event.target.value as PreviewOperatingDay["operatingStatus"], openingTime: event.target.value === "open" ? entry.openingTime : undefined, closingTime: event.target.value === "open" ? entry.closingTime : undefined })} className={editInputClass}><option value="open">営業日</option><option value="closed">休園日</option><option value="unknown">確認が必要</option></select></EditLabel>
                  {entry.operatingStatus === "open" && <>
                    <EditLabel label="開園時間"><input aria-label={`${entry.date}の開園時間`} type="time" value={entry.openingTime || ""} onChange={(event) => onChange(entry.externalKey, { openingTime: event.target.value || undefined })} className={editInputClass} /></EditLabel>
                    <EditLabel label="閉園時間"><input aria-label={`${entry.date}の閉園時間`} type="time" value={entry.closingTime || ""} onChange={(event) => onChange(entry.externalKey, { closingTime: event.target.value || undefined })} className={editInputClass} /></EditLabel>
                  </>}
                  <EditLabel label="公式タイトル" wide><input aria-label={`${entry.date}の公式タイトル`} value={entry.sourceTitle} onChange={(event) => onChange(entry.externalKey, { sourceTitle: event.target.value })} className={editInputClass} /></EditLabel>
                  <EditLabel label="注記" wide><textarea aria-label={`${entry.date}の注記`} rows={3} value={entry.notes} onChange={(event) => onChange(entry.externalKey, { notes: event.target.value })} className={`${editInputClass} resize-y py-2`} /></EditLabel>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EditLabel({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}><span className="mb-1 block text-[9px] font-black text-ink/45">{label}</span>{children}</label>;
}
