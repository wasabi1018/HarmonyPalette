import { NextResponse } from "next/server";
import { getOfficialUpdateEvent } from "@/lib/official-monitor/repository";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  const { id } = await context.params;
  try {
    const detail = await getOfficialUpdateEvent(id);
    return detail ? NextResponse.json(detail) : NextResponse.json({ error: "更新履歴が見つかりません。" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新履歴を取得できませんでした。" }, { status: 500 });
  }
}
