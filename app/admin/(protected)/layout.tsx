import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { InstagramSessionProvider } from "@/components/admin/instagram-session-provider";
import { getAdminAccess } from "@/lib/supabase/auth-server";

// Authentication must run for each request, including builds without auth configuration.
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const access = await getAdminAccess();

  if (!access.ok) {
    const error = access.reason === "forbidden"
      ? "forbidden"
      : access.reason === "unconfigured"
        ? "unconfigured"
        : "signin";
    redirect(`/admin/login?error=${error}`);
  }

  return (
    <InstagramSessionProvider><AdminShell userEmail={access.user.email || "管理者"}>
      {children}
    </AdminShell></InstagramSessionProvider>
  );
}
