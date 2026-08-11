import { importHarmonylandOfficialSchedules, summarizeImportPreview } from "@/lib/official-import/harmonyland";
import { addDays } from "@/lib/official-import/utils";

function argumentValue(name: string) {
  const direct = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const from = argumentValue("--from") || today;
  const to = argumentValue("--to") || addDays(from, 6);
  const includeFanStudio = process.argv.includes("--fanstudio");
  const operatingDaysOnly = process.argv.includes("--operating-days-only");
  const excludeOperatingDays = process.argv.includes("--exclude-operating-days");
  if (operatingDaysOnly && excludeOperatingDays) throw new Error("営業情報のみと営業情報除外は同時に指定できません。");
  const persist = process.argv.includes("--persist");

  const preview = await importHarmonylandOfficialSchedules({
    from,
    to,
    includeSchedules: !operatingDaysOnly,
    includeParkOperatingDays: !excludeOperatingDays,
    includeFanStudio: !operatingDaysOnly && includeFanStudio,
    onProgress: (message) => console.error(`[Harmony Palette] ${message}`),
  });

  if (persist) {
    const { persistImportPreview } = await import("@/lib/supabase/schedule-repository");
    await persistImportPreview(preview, "cli");
    console.error(`[Harmony Palette] Supabaseへ確認待ちデータを保存しました: ${preview.runId}`);
  }
  const summary = summarizeImportPreview(preview);
  if (process.argv.includes("--summary")) {
    console.log(JSON.stringify({
      runId: summary.runId,
      scheduleCount: summary.scheduleCount,
      operationCount: summary.operationCount,
      operatingDayCount: summary.operatingDayCount,
      documentCount: summary.documentCount,
      warnings: summary.warnings,
      fanStudioSchedules: summary.schedules
        .filter((entry) => entry.sourceId === "harmonyland-funstudio")
        .map((entry) => ({ date: entry.date, startTime: entry.startTime, endTime: entry.endTime, title: entry.title, location: entry.location, confidence: entry.confidence })),
      persisted: persist,
    }, null, 2));
  } else {
    console.log(JSON.stringify({ ...summary, persisted: persist }, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
