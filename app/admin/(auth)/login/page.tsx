import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  getAdminAccess,
  getAdminAuthConfigStatus,
} from "@/lib/supabase/auth-server";

export const metadata: Metadata = {
  title: "管理者ログイン",
  description: "Harmony Palette管理画面のログインページです。",
};

function safeNextPath(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}

function messageForError(error: string | string[] | undefined) {
  if (error === "forbidden") {
    return "このアカウントには管理者権限がありません。管理者として登録されたアカウントでログインしてください。";
  }
  if (error === "unconfigured") {
    return "Supabase Authの設定が完了していません。環境変数を確認してください。";
  }
  if (error === "signin") {
    return "管理画面を利用するにはログインが必要です。";
  }
  return "";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const access = await getAdminAccess();

  if (access.ok) {
    redirect(nextPath);
  }

  const config = getAdminAuthConfigStatus();

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fffafd] px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/10 bg-white px-4 text-[11px] font-black text-ink/55 shadow-soft transition hover:border-pink/30 hover:text-pink sm:left-6 sm:top-6"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        公開サイトへ戻る
      </Link>

      <section className="w-full max-w-[460px] rounded-[28px] border border-pink/10 bg-white px-6 py-8 shadow-card sm:px-9 sm:py-10">
        <div className="mx-auto flex justify-center">
          <Image
            src="/logo-hero.png"
            alt="Harmony Palette"
            width={250}
            height={83}
            priority
            className="h-auto w-[250px]"
          />
        </div>

        <div className="mt-4 text-center">
          <p className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-pink">
            <ShieldCheck size={15} aria-hidden="true" />
            ADMIN CONSOLE
          </p>
          <h1 className="mt-2 font-display text-[28px] font-semibold text-ink">
            管理者ログイン
          </h1>
          <p className="mx-auto mt-2 max-w-[340px] text-[12px] font-bold leading-6 text-ink/50">
            記事やスケジュールを管理するための専用画面です。
          </p>
        </div>

        <AdminLoginForm
          configured={config.configured}
          initialMessage={messageForError(params.error)}
          nextPath={nextPath}
        />

        <p className="mt-6 border-t border-pink/10 pt-5 text-center text-[10px] font-bold leading-5 text-ink/35">
          管理者として許可されたアカウントのみ利用できます。
        </p>
      </section>
    </main>
  );
}
