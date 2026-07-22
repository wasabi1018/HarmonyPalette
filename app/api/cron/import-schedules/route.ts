import { NextResponse } from "next/server";
import { importHarmonylandOfficialSchedules, summarizeImportPreview } from "@/lib/official-import/harmonyland";
import { persistImportPreview, publishImportRun } from "@/lib/supabase/schedule-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET || process.env.ADMIN_IMPORT_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configuredSecret || supplied !== configuredSecret) {
    return NextResponse.json({ error: "定期バッチの認証に失敗しました。" }, { status: 401 });
  }

  try {
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
    const preview = await importHarmonylandOfficialSchedules({ from: today, to: today, includeFanStudio: true });
    await persistImportPreview(preview, "scheduled");
    const autoPublished = process.env.AUTO_PUBLISH_IMPORTS === "true" && preview.warnings.length === 0;
    if (autoPublished) await publishImportRun(preview.runId);
    return NextResponse.json({ ...summarizeImportPreview(preview), persisted: true, autoPublished });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "定期取込に失敗しました。" }, { status: 500 });
  }
}
