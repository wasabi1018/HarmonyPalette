import type { NextRequest } from "next/server";
import { refreshSupabaseAuthSession } from "@/lib/supabase/auth-middleware";

export function middleware(request: NextRequest) {
  return refreshSupabaseAuthSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
