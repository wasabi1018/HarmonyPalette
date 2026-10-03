import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getMetaConfig } from "@/lib/instagram-dm/meta";
import { runInstagramDmWorker } from "@/lib/instagram-dm/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.INSTAGRAM_DM_WORKER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !supplied || Buffer.byteLength(supplied) !== Buffer.byteLength(secret)
    || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getMetaConfig()) return NextResponse.json({ error: "Instagram is not configured" }, { status: 503 });
  try {
    let processed = 0;
    for (let pass = 0; pass < 3; pass += 1) {
      const count = await runInstagramDmWorker();
      processed += count;
      if (!count) break;
    }
    return NextResponse.json({ processed });
  } catch (error) {
    console.error("Instagram DM worker failed", error);
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}
