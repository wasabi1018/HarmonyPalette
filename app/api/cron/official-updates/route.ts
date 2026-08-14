import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runOfficialUpdateMonitor } from "@/lib/official-monitor/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

async function handle(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runOfficialUpdateMonitor(false));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Monitor failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
