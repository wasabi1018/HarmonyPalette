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
    const body = await request.json() as { from?: string; to?: string; includeFanStudio?: boolean };
    const preview = await importHarmonylandOfficialSchedules({
      from: body.from || "",
      to: body.to || "",
      includeFanStudio: body.includeFanStudio !== false,
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
