import { NextResponse } from "next/server";
import { importHarmonylandOfficialSchedules, summarizeImportPreview } from "@/lib/official-import/harmonyland";
import { persistImportPreview } from "@/lib/supabase/schedule-repository";
import { assertImportAuthorization, getSupabaseConfigStatus } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  try {
    const body = await request.json() as {
      from?: string;
      to?: string;
      includeOperatingDays?: boolean;
      includeDailySchedules?: boolean;
      includeFanStudio?: boolean;
      importMode?: "all" | "operating-days-only" | "exclude-operating-days";
    };
    const hasExplicitTargets = typeof body.includeOperatingDays === "boolean"
      || typeof body.includeDailySchedules === "boolean";
    const importMode = body.importMode || "all";
    if (!hasExplicitTargets && !("all" === importMode || "operating-days-only" === importMode || "exclude-operating-days" === importMode)) {
      return NextResponse.json({ error: "取込対象が正しくありません。" }, { status: 400 });
    }
    const includeSchedules = hasExplicitTargets
      ? body.includeDailySchedules === true
      : importMode !== "operating-days-only";
    const includeParkOperatingDays = hasExplicitTargets
      ? body.includeOperatingDays === true
      : importMode !== "exclude-operating-days";
    const includeFanStudio = hasExplicitTargets
      ? body.includeFanStudio === true
      : includeSchedules && body.includeFanStudio !== false;
    if (!includeSchedules && !includeParkOperatingDays && !includeFanStudio) {
      return NextResponse.json({ error: "取込対象を1つ以上選択してください。" }, { status: 400 });
    }
    const preview = await importHarmonylandOfficialSchedules({
      from: body.from || "",
      to: body.to || "",
      includeSchedules,
      includeParkOperatingDays,
      includeFanStudio,
    });
    const config = getSupabaseConfigStatus();
    let persisted = false;
    if (config.canWrite) {
      await persistImportPreview(preview, "manual");
      persisted = true;
    }
    return NextResponse.json({ ...summarizeImportPreview(preview), persisted, config });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "取込処理に失敗しました。" }, { status: 500 });
  }
}
