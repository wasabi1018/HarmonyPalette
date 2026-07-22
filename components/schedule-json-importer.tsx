"use client";

import { ChangeEvent, useState } from "react";
import { CheckCircle2, Download, FileJson, Upload } from "lucide-react";
import { bundledOfficialImport, importScheduleEntries } from "@/lib/schedule-store";
import { parseScheduleImportJson, type ScheduleImportResult } from "@/lib/schedule-import";

export function ScheduleJsonImporter() {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ScheduleImportResult | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const validate = (value: string) => {
    setFeedback("");
    try {
      const result = parseScheduleImportJson(value);
      setPreview(result);
      setError("");
      return result;
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : "JSONを確認できませんでした。");
      return null;
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setRaw(text);
    validate(text);
  };

  const handleImport = () => {
    const result = preview ?? validate(raw);
    if (!result) return;
    const imported = importScheduleEntries(result.entries);
    setFeedback(`追加 ${imported.added}件・更新 ${imported.updated}件・登録済み ${imported.skipped}件。スケジュールへ反映しました。`);
  };

  const inferredCount = preview?.entries.filter((entry) => entry.verificationStatus === "year-inferred").length ?? 0;

  return (
    <section className="mb-5 rounded-[24px] border border-mint/20 bg-gradient-to-br from-[#eefaf4] via-white to-[#fffafd] p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.16em] text-[#35745f]"><FileJson size={15} aria-hidden="true" />JSON IMPORT</p>
          <h2 className="mt-1 text-xl font-black text-ink">公式スケジュールJSONを取り込む</h2>
          <p className="mt-2 text-[12px] font-bold leading-6 text-ink/55">schemaVersion 1のJSONを検証し、同じIDは重複登録せず、新しい予定だけをブラウザー保存データへ追加します。</p>
        </div>
        <a href="/data/harmonyland-official-schedule-2026-07-03-08-15.json" download className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-mint/30 bg-white px-4 text-[11px] font-black text-[#35745f] hover:bg-mint/10"><Download size={14} aria-hidden="true" />今回のJSONをダウンロード</a>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-mint/20 bg-white p-4">
          <label className="block text-[11px] font-black text-ink/55" htmlFor="schedule-json-file">JSONファイルを選択</label>
          <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-mint/40 bg-mint/5 px-3 text-[12px] font-black text-[#35745f] hover:bg-mint/10"><Upload size={16} aria-hidden="true" />{fileName || "ファイルを選択"}<input id="schedule-json-file" type="file" accept=".json,application/json" onChange={handleFile} className="sr-only" /></label>
          <p className="mt-3 text-[10px] font-bold leading-5 text-ink/40">同梱データ：{bundledOfficialImport.entries.length}件（PDF 7月3日、画像 8月3日・8月15日）。初期スケジュールへ反映済みです。</p>
        </div>

        <div>
          <label htmlFor="schedule-json-text" className="block text-[11px] font-black text-ink/55">またはJSONを貼り付け</label>
          <textarea id="schedule-json-text" value={raw} onChange={(event) => { setRaw(event.target.value); setPreview(null); setError(""); setFeedback(""); }} rows={5} placeholder={'{\n  "schemaVersion": 1,\n  "sources": [...],\n  "schedules": [...]\n}'} className="mt-2 w-full resize-y rounded-xl border border-ink/10 bg-[#fffafd] p-3 font-mono text-[11px] leading-5 text-ink outline-none focus:border-mint" />
          <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => validate(raw)} disabled={!raw.trim()} className="min-h-10 rounded-full border border-ink/10 bg-white px-4 text-[11px] font-black text-ink/65 disabled:cursor-not-allowed disabled:opacity-40">JSONを確認</button><button type="button" onClick={handleImport} disabled={!preview} className="min-h-10 rounded-full bg-[#35745f] px-4 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">確認した内容を取り込む</button></div>
        </div>
      </div>

      {preview && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[11px] font-bold text-ink/55"><CheckCircle2 size={15} className="text-[#35745f]" aria-hidden="true" /><span>検証OK：{preview.entries.length}件</span><span>・データセット：{preview.datasetId}</span>{inferredCount > 0 && <span className="rounded-full bg-[#fff9ec] px-2 py-1 text-[#8a652c]">年推定 {inferredCount}件</span>}{preview.warnings.length > 0 && <span className="text-[#a76624]">警告 {preview.warnings.length}件</span>}</div>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[11px] font-bold text-red-600">{error}</p>}
      {feedback && <p role="status" className="mt-3 rounded-xl bg-mint/10 px-3 py-2.5 text-[11px] font-bold text-[#35745f]">{feedback}</p>}
    </section>
  );
}
