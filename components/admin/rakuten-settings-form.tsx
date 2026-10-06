"use client";

import { LoaderCircle, Save, ShieldCheck, PlugZap } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { RakutenConnectionResult, RakutenCredentials, RakutenSettingsStatus } from "@/lib/rakuten-settings-input";

const emptyInputs: RakutenCredentials = { applicationId: "", accessKey: "", affiliateId: "" };
const fields = [
  { key: "applicationId", label: "アプリID（Application ID）", status: "hasApplicationId", required: true },
  { key: "accessKey", label: "アクセスキー（Access Key）", status: "hasAccessKey", required: true },
  { key: "affiliateId", label: "アフィリエイトID", status: "hasAffiliateId", required: false },
] as const;

export function RakutenSettingsForm({ initialStatus, siteOrigin, setupError }: {
  initialStatus: RakutenSettingsStatus; siteOrigin: string; setupError?: string;
}) {
  // Credentials stay in this form's memory, outside shared/session/browser storage.
  const [values, setValues] = useState<RakutenCredentials>(emptyInputs);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [result, setResult] = useState<RakutenConnectionResult | null>(null);
  const changed = Object.values(values).some((value) => Boolean(value.trim()));
  useEffect(() => {
    if (!changed) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault(); event.returnValue = "";
    }
    function beforeNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm("未保存の楽天API設定があります。入力内容を破棄して移動しますか？")) {
        event.preventDefault(); event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigation, true);
    };
  }, [changed]);

  function update(key: keyof RakutenCredentials, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(""); setIsError(false); setResult(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "test" ? "test" : "save";
    if (busy || setupError) return;
    setBusy(action); setMessage(""); setIsError(false); setResult(null);
    try {
      const response = await fetch("/api/admin/rakuten-settings", {
        method: action === "test" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(values), cache: "no-store",
      });
      const data = await response.json() as { settings?: RakutenSettingsStatus; result?: RakutenConnectionResult; error?: string };
      if (!response.ok) throw new Error(data.error || "操作を完了できませんでした。");
      if (action === "save") {
        if (!data.settings) throw new Error("保存結果を確認できませんでした。");
        setStatus(data.settings); setValues(emptyInputs);
        setMessage("楽天API設定を保存しました。入力したキーは画面から消去しました。");
      } else {
        if (!data.result) throw new Error("接続確認の結果を取得できませんでした。");
        setResult(data.result);
        setMessage(`接続できました。商品情報を${data.result.itemCount}件取得しました。${changed ? "入力内容はまだ保存していません。" : ""}`);
      }
    } catch (error) {
      setIsError(true); setMessage(error instanceof Error ? error.message : "操作を完了できませんでした。");
    } finally { setBusy(null); }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5" autoComplete="off">
      <section className="rounded-[22px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[21px] font-black text-ink">接続情報</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.configured ? "bg-green-50 text-green-800" : "bg-ink/5 text-ink/65"}`}>{status.configured ? "保存済み" : "未設定"}</span>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-ink/70">楽天ウェブサービスで発行した値を入力してください。保存済みの項目は、変更するときだけ入力します。</p>
        {setupError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{setupError}</p>}
        <fieldset disabled={Boolean(busy) || Boolean(setupError)} className="mt-5 space-y-5">
          <legend className="sr-only">楽天APIの認証情報</legend>
          {fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`rakuten-${field.key}`} className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                {field.label}<span className="text-xs font-medium text-ink/60">{field.required ? "必須" : "任意"}</span>
                {status[field.status] && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">登録済み</span>}
              </label>
              <input id={`rakuten-${field.key}`} name={field.key} type="password" autoComplete="new-password"
                required={field.required && !status[field.status]} maxLength={512} value={values[field.key]}
                onChange={(event) => update(field.key, event.target.value)} spellCheck={false} autoCapitalize="none"
                placeholder={status[field.status] ? "変更する場合のみ入力" : "楽天の取得画面から貼り付け"}
                aria-describedby={field.key === "affiliateId" ? "rakuten-affiliate-help" : "rakuten-credentials-help"}
                className="mt-2 min-h-11 w-full rounded-xl border border-ink/15 px-3 text-sm font-medium outline-none focus:border-pink focus:ring-2 focus:ring-pink/20" />
            </div>
          ))}
        </fieldset>
        <p id="rakuten-credentials-help" className="mt-4 text-xs leading-6 text-ink/70">アプリIDとアクセスキーは、同じアプリで発行された組み合わせを使用します。保存済みの値は表示されません。空欄の項目は現在の値を維持します。</p>
        <p id="rakuten-affiliate-help" className="mt-2 text-xs leading-6 text-ink/70">アフィリエイトIDは商品紹介リンクの作成に使います。未登録でもAPI接続の確認はできます。</p>
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#fff8fb] p-3 text-xs leading-6 text-ink/70">
          <ShieldCheck size={17} className="mt-1 shrink-0 text-[#b43e68]" aria-hidden="true" />
          <p>入力した情報は管理者専用の保存先で管理します。チャットへの貼り付けは不要です。</p>
        </div>
        {status.updatedAt && <p className="mt-4 text-xs text-ink/65">最終保存：{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(status.updatedAt))}</p>}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="submit" name="action" value="test" disabled={Boolean(busy) || Boolean(setupError) || (!changed && !status.configured)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-pink/30 bg-white px-5 text-sm font-bold text-[#b43e68] disabled:cursor-not-allowed disabled:opacity-40">
            {busy === "test" ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <PlugZap size={16} aria-hidden="true" />}{busy === "test" ? "接続確認中…" : "接続を確認"}
          </button>
          <button type="submit" name="action" value="save" disabled={Boolean(busy) || Boolean(setupError) || !changed} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c94372] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
            {busy === "save" ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}{busy === "save" ? "保存中…" : "設定を保存"}
          </button>
        </div>
        <p role={isError ? "alert" : "status"} className={`mt-4 text-sm leading-6 ${isError ? "text-red-700" : "text-ink/70"}`}>{message || (changed ? "未保存の入力があります。" : "")}</p>
        {result && <div className="mt-3 rounded-xl border border-green-100 bg-green-50/40 p-4 text-sm leading-6 text-ink/75">
          <p className="font-bold">商品情報の取得を確認しました</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{result.itemNames.map((name, index) => <li key={index} className="break-words">{name}</li>)}</ul>
          <p className="mt-3 text-xs">{result.affiliateReady ? "アフィリエイトリンクの取得も確認できました。" : "アフィリエイトリンクは未確認です。利用する場合はIDと楽天側の登録を確認してください。"}</p>
          <p className="mt-2 text-xs"><a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a></p>
        </div>}
      </section>
      <section className="rounded-[22px] border border-pink/10 bg-[#fff8fb] p-4 sm:p-6">
        <h2 className="text-lg font-black text-ink">楽天側の登録を確認する</h2>
        <p className="mt-2 text-sm leading-7 text-ink/70">楽天ウェブサービスのアプリ設定で、このサイトのURL（{siteOrigin}）と利用するAPIの登録内容を確認してください。接続確認では楽天市場の商品検索を使用します。</p>
        <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#b43e68] hover:underline">楽天ウェブサービスを開く</a>
      </section>
    </form>
  );
}
