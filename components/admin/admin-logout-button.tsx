"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminLogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } finally {
      router.replace("/admin/login");
      router.refresh();
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={submitting}
      aria-label="管理画面からログアウト"
      className={
        compact
          ? "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink/10 text-ink/45 transition hover:border-pink/25 hover:text-pink disabled:opacity-50"
          : "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] font-bold text-ink/50 transition hover:bg-pink/5 hover:text-pink disabled:opacity-50"
      }
    >
      {submitting ? (
        <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOut size={16} aria-hidden="true" />
      )}
      {!compact && "ログアウト"}
    </button>
  );
}
