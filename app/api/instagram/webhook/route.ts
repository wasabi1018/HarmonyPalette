import { after, NextResponse } from "next/server";
import { getMetaConfig } from "@/lib/instagram-dm/meta";
import { verifyMetaSignature } from "@/lib/instagram-dm/signature";
import { parseInstagramEvents } from "@/lib/instagram-dm/domain";
import { persistInstagramEvent } from "@/lib/instagram-dm/webhook";
import { runInstagramDmWorker } from "@/lib/instagram-dm/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const config = getMetaConfig();
  if (!config) return new Response("Not configured", { status: 503 });
  const params = new URL(request.url).searchParams;
  if (params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== config.verifyToken) {
    return new Response("Forbidden", { status: 403 });
  }
  const challenge = params.get("hub.challenge");
  return challenge ? new Response(challenge) : new Response("Bad request", { status: 400 });
}

export async function POST(request: Request) {
  const config = getMetaConfig();
  if (!config) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), config.appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const events = parseInstagramEvents(body, config.accountId);
    for (const event of events) await persistInstagramEvent(event);
    if (events.length) after(async () => {
      try {
        for (let pass = 0; pass < 3; pass += 1) {
          if (await runInstagramDmWorker() === 0) break;
        }
      } catch (error) {
        console.error("Instagram immediate delivery failed; scheduled worker will retry", error);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Instagram webhook persistence failed", error);
    return NextResponse.json({ error: "Temporary failure" }, { status: 500 });
  }
}
