"use client";

import { ExternalLink, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import { normalizeRakutenRoomUrl } from "@/lib/rakuten-room-url";

type LinkPageSettingsFormProps = {
  initialRakutenRoomUrl: string;
  setupError?: string;
};

export function LinkPageSettingsForm({
  initialRakutenRoomUrl,
  setupError = "",
}: LinkPageSettingsFormProps) {
  const [rakutenRoomUrl, setRakutenRoomUrl] = useState(initialRakutenRoomUrl);
  const [savedUrl, setSavedUrl] = useState(initialRakutenRoomUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  let previewUrl = "";
  try {
    previewUrl = normalizeRakutenRoomUrl(rakutenRoomUrl);
  } catch {
    previewUrl = "";
  }

  const save = async () => {
    setSaving(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const normalized = normalizeRakutenRoomUrl(rakutenRoomUrl);
      const response = await fetch("/api/admin/link-page-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rakutenRoomUrl: normalized }),
      });
      const data = await response.json() as {
        settings?: { rakutenRoomUrl: string };
        error?: string;
      };
      if (!response.ok || !data.settings) {
        throw new Error(data.error || "リンク集設定の保存に失敗しました。");
      }
      setRakutenRoomUrl(data.settings.rakutenRoomUrl);
      setSavedUrl(data.settings.rakutenRoomUrl);
      setMessage("保存しました。リンク集ページに反映されます。");
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "リンク集設定の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[22px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[0.14em] text-pink">RAKUTEN ROOM</p>
          <h2 className="mt-1 font-display text-[22px] font-semibold text-ink">
            楽天ROOMリンク
          </h2>
          <p className="mt-2 text-[11px] font-bold leading-5 text-ink/50">
            Instagram用リンク集の一番下に表示する楽天ROOMのURLを設定します。空欄で保存すると「準備中」表示になります。
          </p>
        </div>
        <a
          href="/links"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-pink/20 px-3 text-[10px] font-black text-pink transition hover:bg-pink/5"
        >
          リンク集を確認
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      {setupError && (
        <p className="mt-4 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold leading-5 text-[#76582f]">
          {setupError}
        </p>
      )}

      <label className="mt-5 block">
        <span className="text-[11px] font-black text-ink">楽天ROOM URL</span>
        <span className="mt-2 flex items-center gap-2">
          <input
            type="url"
            value={rakutenRoomUrl}
            onChange={(event) => {
              setRakutenRoomUrl(event.target.value);
              setMessage("");
            }}
            placeholder="https://room.rakuten.co.jp/room_..."
            aria-describedby="rakuten-room-url-help"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-ink/10 px-3 text-[12px] font-bold text-ink outline-none transition focus:border-pink"
          />
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="設定中の楽天ROOMを確認"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-ink/10 text-ink/35 transition hover:border-pink/30 hover:text-pink"
            >
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          )}
        </span>
        <span id="rakuten-room-url-help" className="mt-2 block text-[10px] font-bold text-ink/40">
          https://room.rakuten.co.jp/ から始まるURLのみ保存できます。
        </span>
      </label>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={`min-h-5 text-[10px] font-bold ${messageIsError ? "text-red-600" : "text-pink"}`}
        >
          {message}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || Boolean(setupError) || rakutenRoomUrl === savedUrl}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[11px] font-black text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            : <Save size={15} aria-hidden="true" />}
          {saving ? "保存中…" : "リンクを保存"}
        </button>
      </div>
    </section>
  );
}
