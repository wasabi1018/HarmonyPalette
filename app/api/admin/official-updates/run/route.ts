import { NextResponse } from "next/server";
import { runOfficialUpdateMonitor } from "@/lib/official-monitor/runner";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  try {
    return NextResponse.json(await runOfficialUpdateMonitor(true));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "公式サイトを確認できませんでした。" }, { status: 500 });
  }
}
