import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type AdminAccess =
  | { ok: true; user: User }
  | {
      ok: false;
      reason: "unconfigured" | "signed-out" | "forbidden";
      user: User | null;
    };

function getPublicAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    publishableKey,
    configured: Boolean(url && publishableKey),
  };
}

function getAllowedAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(user: User) {
  const role = typeof user.app_metadata?.role === "string"
    ? user.app_metadata.role.toLowerCase()
    : "";
  const email = user.email?.trim().toLowerCase() || "";

  return role === "admin" || (Boolean(email) && getAllowedAdminEmails().has(email));
}

export function getAdminAuthConfigStatus() {
  const publicConfig = getPublicAuthConfig();
  return {
    configured: publicConfig.configured,
    hasEmailAllowlist: getAllowedAdminEmails().size > 0,
  };
}

export async function createSupabaseAuthServerClient() {
  const { url, publishableKey } = getPublicAuthConfig();
  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes
          // sessions before protected pages are rendered.
        }
      },
    },
  });
}

export async function getAdminAccess(): Promise<AdminAccess> {
  const client = await createSupabaseAuthServerClient();
  if (!client) {
    return { ok: false, reason: "unconfigured", user: null };
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return { ok: false, reason: "signed-out", user: null };
  }

  if (!isAdminUser(data.user)) {
    return { ok: false, reason: "forbidden", user: data.user };
  }

  return { ok: true, user: data.user };
}
