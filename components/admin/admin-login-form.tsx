"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, LoaderCircle, LockKeyhole, LogIn, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminLoginFormProps = {
  configured: boolean;
  initialMessage?: string;
  nextPath: string;
};

const inputClass =
  "min-h-12 w-full rounded-xl border border-ink/10 bg-white px-11 pr-4 text-[14px] font-bold text-ink outline-none transition placeholder:text-ink/30 focus:border-pink focus:ring-4 focus:ring-pink/10 disabled:cursor-not-allowed disabled:bg-ink/[0.03]";

export function AdminLoginForm({
  configured,
  initialMessage,
  nextPath,
}: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialMessage || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured || submitting) return;

    setSubmitting(true);
    setMessage("");

    try {
      const client = getSupabaseBrowserClient();
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      router.replace(nextPath);
      router.refresh();
    } catch {
      setMessage("メールアドレスまたはパスワードを確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
      <label>
        <span className="mb-1.5 block text-[11px] font-black text-ink/55">
          メールアドレス
        </span>
        <span className="relative block">
          <Mail
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35"
            aria-hidden="true"
          />
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            disabled={!configured || submitting}
            className={inputClass}
          />
        </span>
      </label>

      <label>
        <span className="mb-1.5 block text-[11px] font-black text-ink/55">
          パスワード
        </span>
        <span className="relative block">
          <LockKeyhole
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35"
            aria-hidden="true"
          />
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!configured || submitting}
            className={inputClass}
          />
        </span>
      </label>

      {message && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[12px] font-bold leading-5 text-red-600"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}

      {!configured && (
        <p className="rounded-xl border border-[#f1d59c] bg-[#fff9ec] px-3 py-2.5 text-[12px] font-bold leading-5 text-[#76582f]">
          Supabase Authの公開URLと公開キーを設定するとログインできます。
        </p>
      )}

      <button
        type="submit"
        disabled={!configured || submitting}
        className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[13px] font-black text-white shadow-[0_8px_18px_rgba(239,102,143,0.24)] transition hover:bg-[#df587f] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting ? (
          <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
        ) : (
          <LogIn size={17} aria-hidden="true" />
        )}
        {submitting ? "ログイン中…" : "管理画面にログイン"}
      </button>
    </form>
  );
}
