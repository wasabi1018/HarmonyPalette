"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, CircleAlert, KeyRound, LoaderCircle, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { sampleDate } from "@/data/site-data";
import { mergeCharactersWithNames, useCharacters } from "@/lib/character-store";
import {
  addScheduleEntry,
  deleteScheduleEntry,
  eventTypeOptions,
  getEntryCharacterNames,
  greetingTypeOptions,
  refreshScheduleEntries,
  restoreBaseSchedule,
  updateScheduleEntry,
  type ScheduleEntry,
  type ScheduleEntryKind,
  useScheduleEntries,
} from "@/lib/schedule-store";

const inputClass = "min-h-11 w-full rounded-xl border border-ink/10 bg-[#fffafd] px-3 text-[13px] font-bold text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-pink focus:ring-4 focus:ring-pink/10";
const labelClass = "mb-1.5 block text-[11px] font-black text-ink/55";

export function ScheduleManager({ hasAdminSecret }: { hasAdminSecret: boolean }) {
  const entries = useScheduleEntries();
  const catalogCharacters = useCharacters();
  const characters = useMemo(() => mergeCharactersWithNames(
    catalogCharacters,
    entries.flatMap((entry) => getEntryCharacterNames(entry)),
  ), [catalogCharacters, entries]);
  const [kind, setKind] = useState<ScheduleEntryKind>("greeting");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(sampleDate);
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:20");
  const [scheduleType, setScheduleType] = useState(greetingTypeOptions[0]);
  const [location, setLocation] = useState("");
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [sourceName, setSourceName] = useState("管理画面から登録");
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<"all" | ScheduleEntryKind>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const formSectionRef = useRef<HTMLElement>(null);

  const visibleEntries = useMemo(() => entries
    .filter((entry) => filter === "all" || entry.kind === filter)
    .sort((a, b) => `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`)), [entries, filter]);

  const defaultTypeOptions = kind === "greeting" ? greetingTypeOptions : eventTypeOptions;
  const typeOptions = scheduleType && !defaultTypeOptions.includes(scheduleType)
    ? [scheduleType, ...defaultTypeOptions]
    : defaultTypeOptions;
  const switchKind = (value: ScheduleEntryKind) => {
    setKind(value);
    setScheduleType(value === "greeting" ? greetingTypeOptions[0] : eventTypeOptions[0]);
    if (value === "greeting") setEndDate("");
  };
  const toggleCharacter = (id: string) => setCharacterIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const resetForm = () => {
    setEditingId(null);
    setKind("greeting");
    setTitle("");
    setDate(sampleDate);
    setEndDate("");
    setStartTime("10:00");
    setEndTime("10:20");
    setScheduleType(greetingTypeOptions[0]);
    setLocation("");
    setCharacterIds([]);
    setDescription("");
    setOfficialUrl("");
    setSourceName("管理画面から登録");
  };

  const openEdit = (entry: ScheduleEntry) => {
    const selectedNames = new Set(getEntryCharacterNames(entry));
    setEditingId(entry.id);
    setKind(entry.kind);
    setTitle(entry.title);
    setDate(entry.date);
    setEndDate(entry.endDate || "");
    setStartTime(entry.startTime);
    setEndTime(entry.endTime || "");
    setScheduleType(entry.scheduleType);
    setLocation(entry.location);
    setCharacterIds(Array.from(new Set([
      ...entry.characterIds,
      ...characters.filter((character) => selectedNames.has(character.name)).map((character) => character.id),
    ])));
    setDescription(entry.description);
    setOfficialUrl(entry.officialUrl);
    setSourceName(entry.sourceName || "管理画面から登録");
    setFeedback("");
    requestAnimationFrame(() => formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !date || !startTime || !location.trim()) return;

    const selectedCharacters = characters.filter((character) => characterIds.includes(character.id));
    const entryValues = {
      kind,
      title: title.trim(),
      date,
      endDate: kind === "event" && endDate ? endDate : undefined,
      startTime,
      endTime: endTime || undefined,
      characterIds,
      characterNames: selectedCharacters.map((character) => character.name),
      scheduleType,
      location: location.trim(),
      description: description.trim(),
      officialUrl: officialUrl.trim(),
      sourceName: sourceName.trim() || "管理画面から登録",
    };

    setSaving(true);
    setFeedback("");
    try {
      if (editingId?.startsWith("supabase:")) {
        if (!adminSecret) throw new Error("管理用バッチキーを入力してください。");
        const databaseId = editingId.slice("supabase:".length);
        const response = await fetch(`/api/admin/schedules/${encodeURIComponent(databaseId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json", authorization: `Bearer ${adminSecret}` },
          body: JSON.stringify({
            ...entryValues,
            characters: selectedCharacters.map((character) => ({ id: character.id, name: character.name })),
          }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "予定の更新に失敗しました。");
        refreshScheduleEntries();
        setFeedback(`「${entryValues.title}」を更新し、公開画面へ反映しました。`);
      } else if (editingId) {
        const updated = updateScheduleEntry(editingId, entryValues);
        if (!updated) throw new Error("編集対象の予定が見つかりません。");
        setFeedback(`「${updated.title}」を更新しました。`);
      } else {
        const created = addScheduleEntry(entryValues);
        setFeedback(`「${created.title}」を追加しました。`);
      }
      resetForm();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "予定の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, entryTitle: string) => {
    if (!window.confirm(`「${entryTitle}」をスケジュールから削除しますか？`)) return;
    deleteScheduleEntry(id);
    if (editingId === id) resetForm();
    setFeedback(`「${entryTitle}」を削除しました。`);
  };

  const handleRestore = () => {
    if (!window.confirm("追加・削除した内容を消去し、最初のサンプル状態へ戻しますか？")) return;
    restoreBaseSchedule();
    setFeedback("サンプル状態へ戻しました。");
  };

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section ref={formSectionRef} className="min-w-0 scroll-mt-20 rounded-[24px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[11px] font-black tracking-[0.16em] text-pink">{editingId ? "EDIT SCHEDULE" : "ADD SCHEDULE"}</p><h2 className="mt-1 text-xl font-black text-ink">{editingId ? "予定を編集" : "予定を追加"}</h2></div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${editingId?.startsWith("supabase:") ? "bg-mint/15 text-[#35745f]" : "bg-[#fff4df] text-[#a76624]"}`}>{editingId?.startsWith("supabase:") ? "Supabaseへ保存" : "このブラウザーに保存"}</span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <fieldset>
            <legend className={labelClass}>予定の種類</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['greeting', 'グリーティング'], ['event', 'イベント']] as const).map(([value, label]) => (
                <label key={value} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[12px] font-black ${kind === value ? "border-pink bg-pink/5 text-pink" : "border-ink/10 text-ink/55"}`}>
                  <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => switchKind(value)} className="sr-only" />
                  {kind === value && <Check size={14} aria-hidden="true" />}{label}
                </label>
              ))}
            </div>
          </fieldset>

          <label><span className={labelClass}>予定名 <span className="text-pink">必須</span></span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "greeting" ? "例：朝のお出迎えグリーティング" : "例：サマーステージイベント"} className={inputClass} /></label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className={labelClass}>開催日 <span className="text-pink">必須</span></span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
            {kind === "event" && <label><span className={labelClass}>終了日</span><input type="date" min={date} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} /></label>}
            <label><span className={labelClass}>開始時間 <span className="text-pink">必須</span></span><input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>終了時間</span><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass} /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className={labelClass}>イベント・グリーティング種別</span><select value={scheduleType} onChange={(event) => setScheduleType(event.target.value)} className={inputClass}>{typeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span className={labelClass}>開催場所 <span className="text-pink">必須</span></span><input required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="例：エントランス前" className={inputClass} /></label>
          </div>

          <fieldset>
            <legend className={labelClass}>対象キャラクター（複数選択可）</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {characters.map((character) => <label key={character.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-[11px] font-bold ${characterIds.includes(character.id) ? "border-pink bg-pink/5 text-pink" : "border-ink/10 text-ink/65"}`}><input type="checkbox" checked={characterIds.includes(character.id)} onChange={() => toggleCharacter(character.id)} className="sr-only" /><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${characterIds.includes(character.id) ? "border-pink bg-pink text-white" : "border-ink/15"}`}><Check size={12} aria-hidden="true" /></span>{character.name}</label>)}
            </div>
          </fieldset>

          <label><span className={labelClass}>説明</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="注意事項や補足を入力" className={`${inputClass} resize-y py-3`} /></label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className={labelClass}>情報元{editingId?.startsWith("supabase:") ? "（変更不可）" : ""}</span><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} readOnly={editingId?.startsWith("supabase:")} className={`${inputClass} ${editingId?.startsWith("supabase:") ? "cursor-not-allowed bg-ink/[0.03] text-ink/40" : ""}`} /></label>
            <label><span className={labelClass}>公式情報URL</span><input type="url" value={officialUrl} onChange={(event) => setOfficialUrl(event.target.value)} placeholder="https://..." className={inputClass} /></label>
          </div>

          {editingId?.startsWith("supabase:") && <label><span className={`${labelClass} flex items-center gap-1.5`}><KeyRound size={13} aria-hidden="true" />管理用バッチキー <span className="text-pink">必須</span></span><input type="password" autoComplete="current-password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} placeholder={hasAdminSecret ? "ADMIN_IMPORT_SECRET" : "サーバー側の設定が必要です"} className={inputClass} /></label>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={saving || Boolean(editingId?.startsWith("supabase:") && (!hasAdminSecret || !adminSecret))} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[13px] font-black text-white shadow-[0_8px_18px_rgba(239,102,143,0.24)] hover:bg-[#df587f] disabled:cursor-not-allowed disabled:opacity-45">{saving ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : editingId ? <Save size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}{saving ? "保存中…" : editingId ? "変更を保存する" : "予定を追加する"}</button>
            {editingId && <button type="button" onClick={resetForm} disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink/10 px-5 text-[12px] font-black text-ink/55 hover:border-pink/30 hover:text-pink"><X size={15} aria-hidden="true" />編集をキャンセル</button>}
          </div>
          {feedback && <p role="status" className="rounded-xl bg-mint/10 px-3 py-2.5 text-[12px] font-bold text-[#35745f]"><Save size={14} className="mr-1.5 inline" aria-hidden="true" />{feedback}</p>}
        </form>
      </section>

      <section className="min-w-0 h-fit rounded-[24px] border border-pink/10 bg-white p-4 shadow-soft sm:p-5 xl:sticky xl:top-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-black tracking-[0.16em] text-pink">MANAGE SCHEDULE</p><h2 className="mt-1 text-xl font-black text-ink">登録済みの予定</h2></div>
          <button type="button" onClick={handleRestore} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/10 px-3 text-[10px] font-black text-ink/55 hover:border-pink/30 hover:text-pink"><RotateCcw size={13} aria-hidden="true" />初期状態へ戻す</button>
        </div>

        <div className="mt-4 flex gap-2">{([['all', 'すべて'], ['greeting', 'グリーティング'], ['event', 'イベント']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 rounded-full px-3 text-[10px] font-black ${filter === value ? "bg-ink text-white" : "bg-[#f5f2f4] text-ink/55"}`}>{label}</button>)}</div>

        <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto pr-1">
          {visibleEntries.map((entry) => {
            const names = getEntryCharacterNames(entry);
            return <article key={entry.id} className={`rounded-2xl border bg-[#fffdfd] p-3 ${editingId === entry.id ? "border-pink/40 ring-4 ring-pink/5" : "border-ink/10"}`}>
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${entry.kind === "event" ? "bg-[#fff4df] text-[#a76624]" : "bg-pink/10 text-pink"}`}><CalendarDays size={18} aria-hidden="true" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black"><span className={`rounded-full px-2 py-1 ${entry.kind === "event" ? "bg-[#fff4df] text-[#a76624]" : "bg-pink/10 text-pink"}`}>{entry.kind === "event" ? "イベント" : "グリーティング"}</span><span className="rounded-full bg-[#f5f2f4] px-2 py-1 text-ink/45">{entry.isSample ? "サンプル" : entry.isImported ? "JSON取込" : "追加データ"}</span></div><h3 className="mt-1.5 truncate text-[13px] font-black text-ink">{entry.title}</h3><p className="mt-1 text-[10px] font-bold text-ink/45">{entry.date.replaceAll("-", "/")} {entry.startTime}・{entry.location}</p>{names.length > 0 && <p className="mt-1 truncate text-[10px] font-bold text-ink/45">{names.join("・")}</p>}</div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => openEdit(entry)} aria-label={`${entry.title}を編集`} className="grid h-10 w-10 place-items-center rounded-xl border border-lavender/15 bg-lavender/5 text-lavender hover:bg-lavender/10"><Pencil size={15} aria-hidden="true" /></button>
                  <button type="button" onClick={() => handleDelete(entry.id, entry.title)} aria-label={`${entry.title}を削除`} className="grid h-10 w-10 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              </div>
            </article>;
          })}
          {visibleEntries.length === 0 && <p className="rounded-xl border border-dashed border-pink/20 p-6 text-center text-[12px] font-bold text-ink/45">登録されている予定はありません。</p>}
        </div>
      </section>
    </div>
  );
}

export function ScheduleManagerNotice() {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#f1d59c] bg-[#fff9ec] p-4 text-[12px] font-bold leading-6 text-[#76582f] sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-start gap-2"><CircleAlert size={17} className="mt-1 shrink-0" aria-hidden="true" />公式バッチ取込はSupabaseへ保存します。下部の手入力フォームと従来のJSON取込は、移行期間中このブラウザーだけに保存されます。</span>
      <Link href="/schedule" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-[11px] font-black text-ink shadow-sm"><ArrowLeft size={14} aria-hidden="true" />公開画面へ戻る</Link>
    </div>
  );
}
