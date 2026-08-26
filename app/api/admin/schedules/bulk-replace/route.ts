import { NextResponse } from "next/server";
import {
  bulkReplacePublishedSchedules,
  type PublishedScheduleBulkReplacement,
} from "@/lib/supabase/schedule-repository";
import { revalidatePublicScheduleData } from "@/lib/public-cache";
import { assertImportAuthorization } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}を入力してください。`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  return normalized;
}

function parseReplacement(value: unknown): PublishedScheduleBulkReplacement {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("一括置換の内容が正しくありません。");
  }
  const item = value as Record<string, unknown>;
  const field = requiredText(item.field, "置換対象", 20);
  if (field !== "title" && field !== "character") {
    throw new Error("置換対象が正しくありません。");
  }
  const maxLength = field === "title" ? 300 : 80;
  const from = requiredText(item.from, "置換前の名前", maxLength);
  const to = requiredText(item.to, "置換後の名前", maxLength);
  if (from === to) throw new Error("置換前と置換後には異なる名前を指定してください。");
  return { field, from, to };
}

export async function POST(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  try {
    const replacement = parseReplacement(await request.json());
    const result = await bulkReplacePublishedSchedules(replacement);
    revalidatePublicScheduleData();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "一括置換に失敗しました。",
    }, { status: 400 });
  }
}
