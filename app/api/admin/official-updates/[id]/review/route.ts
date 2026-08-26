import { NextResponse } from "next/server";
import { markEventIgnored, resolveOfficialUpdate } from "@/lib/official-monitor/repository";
import { revalidatePublicScheduleData } from "@/lib/public-cache";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  const { id } = await context.params;
  try {
    const body = await request.json() as { action?: string; selectedDiffIds?: unknown[] };
    if (body.action === "ignore") {
      await markEventIgnored(id);
    } else {
      const selected = Array.isArray(body.selectedDiffIds)
        ? body.selectedDiffIds.map(String).filter((value) => /^[0-9a-f-]{36}$/i.test(value))
        : [];
      await resolveOfficialUpdate(id, selected);
      revalidatePublicScheduleData();
    }
    return NextResponse.json({ reviewed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新内容を反映できませんでした。" }, { status: 500 });
  }
}
