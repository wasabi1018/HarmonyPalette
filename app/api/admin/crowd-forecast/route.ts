import { NextResponse } from "next/server";
import { assertImportAuthorization } from "@/lib/supabase/server";
import {
  previewConfig,
  readForecast,
  saveConfig,
  updateForecast,
} from "@/lib/crowd-forecast/repository";
import { getRegisteredCharacters } from "@/lib/supabase/character-repository";
export const dynamic = "force-dynamic";
export const maxDuration = 240;
export async function GET(request: Request) {
  const auth = await assertImportAuthorization(request);
  if (!auth.ok)
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const [saved, characters] = await Promise.all([
      readForecast(),
      getRegisteredCharacters(),
    ]);
    return NextResponse.json(
      {
        ...saved,
        characters: (characters ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          birthdayMonth: c.birthdayMonth,
          birthdayDay: c.birthdayDay,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "設定の読み込みに失敗しました。",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  const auth = await assertImportAuthorization(request);
  if (!auth.ok)
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "同じサイトから操作してください。" },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length") || 0) > 250000)
    return NextResponse.json(
      { error: "設定が大きすぎます。" },
      { status: 413 },
    );
  try {
    const body = await request.json();
    if (body.action === "refresh")
      return NextResponse.json(await updateForecast());
    if (
      !["preview", "save"].includes(body.action) ||
      !Number.isSafeInteger(body.revision) ||
      body.revision < 0
    )
      return NextResponse.json(
        { error: "操作を確認してください。" },
        { status: 400 },
      );
    const result =
      body.action === "preview"
        ? await previewConfig(body.config, body.revision)
        : await saveConfig(body.config, body.revision);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "更新に失敗しました。",
      },
      { status: 400 },
    );
  }
}
