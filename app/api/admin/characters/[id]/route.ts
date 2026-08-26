import { NextResponse } from "next/server";
import { revalidatePublicCharacterData } from "@/lib/public-cache";
import { assertImportAuthorization, getSupabaseAdminClient } from "@/lib/supabase/server";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await assertImportAuthorization(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  const client = getSupabaseAdminClient();
  if (!client) return NextResponse.json({ error: "Supabaseのサーバー用秘密鍵が設定されていません。" }, { status: 503 });

  try {
    const { id } = await context.params;
    const characterId = decodeURIComponent(id).trim();
    if (!characterId) return NextResponse.json({ error: "削除対象を指定してください。" }, { status: 400 });
    const { data, error } = await client.from("characters").delete().eq("id", characterId).select("id, name").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "削除対象のキャラクターが見つかりません。" }, { status: 404 });
    revalidatePublicCharacterData();
    return NextResponse.json({ ok: true, deleted: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "削除に失敗しました。" }, { status: 400 });
  }
}
