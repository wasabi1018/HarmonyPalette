import {
  importHarmonylandOfficialSchedules as importHarmonylandCalendarSchedules,
  type OfficialImportOptions as CalendarImportOptions,
} from "@/lib/official-import/harmonyland";
import type { ImportPreview } from "@/lib/official-import/types";

export { summarizeImportPreview } from "@/lib/official-import/harmonyland";

export type OfficialImportOptions = CalendarImportOptions & {
  includeFanStudio?: boolean;
};

export async function importHarmonylandOfficialSchedules(options: OfficialImportOptions): Promise<ImportPreview> {
  const preview = await importHarmonylandCalendarSchedules(options);
  if (!options.includeFanStudio) return preview;

  options.onProgress?.("ファンスタジオ予定表を取得しています。");
  try {
    const { importFanStudioSchedules } = await import("@/lib/official-import/funstudio");
    const fanStudio = await importFanStudioSchedules(options.from, options.to, options.onProgress);
    preview.schedules.push(...fanStudio.schedules);
    preview.documents.push(...fanStudio.documents);
    preview.warnings.push(...fanStudio.warnings);
  } catch (error) {
    preview.warnings.push(`ファンスタジオの取込に失敗しました（${error instanceof Error ? error.message : String(error)}）。`);
  }
  return preview;
}
