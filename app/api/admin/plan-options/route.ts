import { NextResponse } from "next/server";
import { getAdminPlanOptions } from "@/lib/supabase/plan-options-repository";
import { assertImportAuthorization, getSupabaseAdminClient } from "@/lib/supabase/server";

type OptionType = "attraction" | "facility";

type PlanOptionInput = {
  id?: unknown;
  type?: unknown;
  name?: unknown;
  facilityId?: unknown;
  displayOrder?: unknown;
  isActive?: unknown;
};

function parseInput(input: PlanOptionInput, requireId: boolean) {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const type = input.type;
  const name = typeof input.name === "string"
    ? input.name.normalize("NFKC").trim().replace(/\s+/g, " ")
    : "";
  const displayOrder = input.displayOrder === undefined ? 999 : Number(input.displayOrder);
  const facilityId = typeof input.facilityId === "string" && input.facilityId.trim()
    ? input.facilityId.trim()
    : null;

  if (type !== "attraction" && type !== "facility") {
    throw new Error("候補の種類が正しくありません。");
  }
  if ((requireId && !id) || !name) throw new Error("名称を入力してください。");
  if (name.length > 120) throw new Error("名称は120文字以内で入力してください。");
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 999999) {
    throw new Error("表示順は0〜999999の整数で指定してください。");
  }

  return {
    id,
    type: type as OptionType,
    name,
    facilityId,
    displayOrder,
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
  };
}

function tableFor(type: OptionType) {
  return type === "facility" ? "plan_facilities" : "plan_attractions";
}

function toRow(input: ReturnType<typeof parseInput>) {
  return {
    name: input.name,
    display_order: input.displayOrder,
    is_active: input.isActive,
    ...(input.type === "attraction" ? { facility_id: input.facilityId } : {}),
  };
}

async function authorize(request: Request) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }
  return null;
}

export async function GET(request: Request) {
  const unauthorized = await authorize(request);
  if (unauthorized) return unauthorized;
  if (!getSupabaseAdminClient()) {
    return NextResponse.json({ error: "Supabaseのサーバー用秘密鍵が設定されていません。" }, { status: 503 });
  }

  try {
    const options = await getAdminPlanOptions();
    return NextResponse.json(options ?? { attractions: [], facilities: [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "候補を読み込めませんでした。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await authorize(request);
  if (unauthorized) return unauthorized;
  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Supabaseのサーバー用秘密鍵が設定されていません。" }, { status: 503 });
  }

  try {
    const input = parseInput(await request.json() as PlanOptionInput, false);
    const { data, error } = await client.from(tableFor(input.type)).insert(toRow(input)).select("*").single();
    if (error) throw new Error(error.code === "23505" ? "同じ名称がすでに登録されています。" : error.message);
    return NextResponse.json({ ok: true, option: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登録に失敗しました。" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await authorize(request);
  if (unauthorized) return unauthorized;
  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: "Supabaseのサーバー用秘密鍵が設定されていません。" }, { status: 503 });
  }

  try {
    const input = parseInput(await request.json() as PlanOptionInput, true);
    const { data, error } = await client
      .from(tableFor(input.type))
      .update(toRow(input))
      .eq("id", input.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.code === "23505" ? "同じ名称がすでに登録されています。" : error.message);
    if (!data) return NextResponse.json({ error: "編集対象が見つかりません。" }, { status: 404 });
    return NextResponse.json({ ok: true, option: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新に失敗しました。" },
      { status: 400 },
    );
  }
}
