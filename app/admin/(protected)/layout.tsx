import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAccess } from "@/lib/supabase/auth-server";

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
    <AdminShell userEmail={access.user.email || "管理者"}>
      {children}
    </AdminShell>
  );
}
