import "server-only";
import { getAdminAccess } from "@/lib/supabase/auth-server";
export async function authorizeTravelAdmin(request: Request, mutation = false) {
  const access = await getAdminAccess();
  if (!access.ok)
    return Response.json(
      { error: "管理者ログインが必要です。" },
      { status: access.reason === "signed-out" ? 401 : 403 },
    );
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  if (mutation && request.headers.get("origin") !== `${protocol}://${host}`)
    return Response.json(
      { error: "同じサイトの管理画面から操作してください。" },
      { status: 403 },
    );
  return null;
}
export async function limitedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("送信データが大きすぎます。");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("送信データがありません。");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("送信データが大きすぎます。");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
