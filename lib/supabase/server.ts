import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAdminAccess } from "@/lib/supabase/auth-server";

const DEFAULT_SUPABASE_URL = "https://bnbdwstvrjgmfftmmofx.supabase.co";

export type SupabaseConfigStatus = {
  url: string;
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  canRead: boolean;
  canWrite: boolean;
};

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    url,
    hasPublicKey: Boolean(publicKey),
    hasSecretKey: Boolean(secretKey),
    canRead: Boolean(publicKey || secretKey),
    canWrite: Boolean(secretKey),
  };
}

function createServerClient(key: string): SupabaseClient {
  const { url } = getSupabaseConfigStatus();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "harmony-palette" } },
  });
}

export function getSupabaseReadClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createServerClient(key) : null;
}

export function getSupabaseAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createServerClient(key) : null;
}

export async function assertImportAuthorization(request: Request) {
  const adminAccess = await getAdminAccess();
  if (adminAccess.ok) {
    return { ok: true as const };
  }

  const configuredSecret = process.env.ADMIN_IMPORT_SECRET;
  if (!configuredSecret) {
    return {
      ok: false as const,
      status: adminAccess.reason === "unconfigured" ? 503 : 401,
      message: adminAccess.reason === "unconfigured"
        ? "管理者認証が設定されていません。"
        : "管理者としてログインしてください。",
    };
  }
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (supplied !== configuredSecret) {
    return { ok: false as const, status: 401, message: "管理用バッチキーが正しくありません。" };
  }
  return { ok: true as const };
}
