import { parseHarmonylandDailyPdf } from "@/lib/official-import/daily-pdf-parser";
import { importFanStudioSchedules } from "@/lib/official-import/funstudio";
import { normalizeParkOperatingDay, type HarmonylandCalendarRecord } from "@/lib/official-import/park-operating-days";
import type { ImportPreview, SourceDocument } from "@/lib/official-import/types";
import { addDays, createRunId, sha256 } from "@/lib/official-import/utils";
import { SITE_URL } from "@/lib/site-config";

const CALENDAR_API = "https://www.harmonyland.jp/wp/?mc-api=json";
const USER_AGENT = `HarmonyPaletteImporter/0.1 (+${SITE_URL})`;

type CalendarResponse = Record<string, HarmonylandCalendarRecord[]>;

export type OfficialImportOptions = {
  from: string;
  to: string;
  includeSchedules?: boolean;
  includeParkOperatingDays?: boolean;
  includeFanStudio?: boolean;
  onProgress?: (message: string) => void;
};

function validateRange(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new Error("取得期間はYYYY-MM-DD形式で指定してください。");
  }
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days < 1 || days > 31) throw new Error("一度に取得できる期間は1〜31日です。");
}

export async function importHarmonylandOfficialSchedules(options: OfficialImportOptions): Promise<ImportPreview> {
  validateRange(options.from, options.to);
  const runId = createRunId();
  const generatedAt = new Date().toISOString();
  const schedules: ImportPreview["schedules"] = [];
  const operations: ImportPreview["operations"] = [];
  const operatingDays: ImportPreview["operatingDays"] = [];
  const documents: SourceDocument[] = [];
  const warnings: string[] = [];
  const includeSchedules = options.includeSchedules !== false;
  const includeParkOperatingDays = options.includeParkOperatingDays !== false;
  if (includeSchedules || includeParkOperatingDays) {
    const apiUrl = `${CALENDAR_API}&from=${options.from}&to=${options.to}`;
    options.onProgress?.("公式カレンダーを取得しています。");
    const response = await fetch(apiUrl, { headers: { "user-agent": USER_AGENT }, cache: "no-store" });
    if (!response.ok) throw new Error(`公式カレンダーAPIの取得に失敗しました: ${response.status}`);
    const rawJson = await response.text();
    const jsonBytes = new TextEncoder().encode(rawJson);
    let calendar: CalendarResponse;
    try {
      calendar = JSON.parse(rawJson) as CalendarResponse;
    } catch {
      throw new Error("公式カレンダーAPIから有効なJSONが返されませんでした。");
    }
    documents.push({
      sourceId: "harmonyland-calendar",
      sourceUrl: apiUrl,
      contentType: "application/json",
      sha256: sha256(jsonBytes),
      bytes: jsonBytes,
      metadata: { role: "calendar-api", from: options.from, to: options.to },
    });
    const seenDates = new Set(Object.keys(calendar));

    if (includeParkOperatingDays) {
      for (let date = options.from; date <= options.to; date = addDays(date, 1)) {
        if (!seenDates.has(date)) warnings.push(`${date}: 公式カレンダーに営業情報がありません。`);
      }
    }

    for (const [date, records] of Object.entries(calendar).sort(([a], [b]) => a.localeCompare(b))) {
      const operatingDay = normalizeParkOperatingDay(date, records, apiUrl);
      if (includeParkOperatingDays) {
        operatingDays.push(operatingDay);
        if (operatingDay.verificationStatus !== "verified") {
          warnings.push(`${date}: ${operatingDay.notes}`);
        }
      }

      if (!includeSchedules) continue;
      const pdf = records.find((record) => record.event_link?.toLocaleLowerCase().includes(".pdf"));
      if (!pdf?.event_link) {
        if (operatingDay.operatingStatus !== "closed") {
          warnings.push(`${date}: 日別スケジュールPDFが登録されていません。`);
        }
        continue;
      }
      options.onProgress?.(`${date}の公式PDFを解析しています。`);
      try {
        const pdfResponse = await fetch(pdf.event_link, { headers: { "user-agent": USER_AGENT }, cache: "no-store" });
        if (!pdfResponse.ok) throw new Error(`HTTP ${pdfResponse.status}`);
        const bytes = new Uint8Array(await pdfResponse.arrayBuffer());
        documents.push({
          sourceId: "harmonyland-calendar",
          sourceUrl: pdf.event_link,
          documentDate: date,
          contentType: pdfResponse.headers.get("content-type") || "application/pdf",
          sha256: sha256(bytes),
          bytes,
          metadata: {
            role: "daily-schedule",
            calendarTitle: pdf.event_title || "",
            openingTime: pdf.event_time || "",
            closingTime: pdf.event_endtime || "",
          },
        });
        const parsed = await parseHarmonylandDailyPdf(date, pdf.event_link, bytes);
        schedules.push(...parsed.schedules);
        operations.push(...parsed.operations);
        if (parsed.schedules.length === 0) warnings.push(`${date}: PDFからイベント／グリーティングを抽出できませんでした。`);
        if (parsed.operations.length === 0) warnings.push(`${date}: PDFからアトラクション運行情報を抽出できませんでした。`);
      } catch (error) {
        warnings.push(`${date}: PDF解析に失敗しました（${error instanceof Error ? error.message : String(error)}）。`);
      }
    }
  }

  if (options.includeFanStudio) {
    options.onProgress?.("ファンスタジオ予定表を取得しています。");
    try {
      const fanStudio = await importFanStudioSchedules(options.from, options.to, options.onProgress);
      schedules.push(...fanStudio.schedules);
      documents.push(...fanStudio.documents);
      warnings.push(...fanStudio.warnings);
    } catch (error) {
      warnings.push(`ファンスタジオの取込に失敗しました（${error instanceof Error ? error.message : String(error)}）。`);
    }
  }

  return { runId, generatedAt, rangeStart: options.from, rangeEnd: options.to, schedules, operations, operatingDays, documents, warnings };
}

export function summarizeImportPreview(preview: ImportPreview) {
  return {
    runId: preview.runId,
    generatedAt: preview.generatedAt,
    rangeStart: preview.rangeStart,
    rangeEnd: preview.rangeEnd,
    scheduleCount: preview.schedules.length,
    operationCount: preview.operations.length,
    operatingDayCount: preview.operatingDays.length,
    documentCount: preview.documents.length,
    warnings: preview.warnings,
    schedules: preview.schedules.map(({ rawPayload, ...entry }) => ({ ...entry, hasRawPayload: Object.keys(rawPayload).length > 0 })),
    operations: preview.operations.map(({ rawPayload, ...entry }) => ({ ...entry, hasRawPayload: Object.keys(rawPayload).length > 0 })),
    operatingDays: preview.operatingDays.map(({ rawPayload, ...entry }) => ({ ...entry, hasRawPayload: Object.keys(rawPayload).length > 0 })),
  };
}
