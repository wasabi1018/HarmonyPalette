"use client";

import { ExternalLink, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import {
  normalizeInstagramPostUrl,
  type InstagramPostUrls,
} from "@/data/instagram-posts";

type InstagramEmbedSettingsFormProps = {
  initialPostUrls: InstagramPostUrls;
  setupError?: string;
};

export function InstagramEmbedSettingsForm({
  initialPostUrls,
  setupError = "",
}: InstagramEmbedSettingsFormProps) {
  const [postUrls, setPostUrls] = useState<InstagramPostUrls>(initialPostUrls);
  const [savedPostUrls, setSavedPostUrls] = useState<InstagramPostUrls>(initialPostUrls);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const updateUrl = (index: number, value: string) => {
    setPostUrls((current) => current.map((url, itemIndex) => (
      itemIndex === index ? value : url
    )) as InstagramPostUrls);
    setMessage("");
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setMessageIsError(false);
    try {
      const normalized = postUrls.map((url) => normalizeInstagramPostUrl(url)) as InstagramPostUrls;
      if (normalized[0] === normalized[1]) {
        throw new Error("異なるInstagram投稿URLを2件入力してください。");
      }
      const response = await fetch("/api/admin/instagram-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrls: normalized }),
      });
      const data = await response.json() as {
        settings?: { postUrls: InstagramPostUrls };
        error?: string;
      };
      if (!response.ok || !data.settings) {
        throw new Error(data.error || "Instagram表示設定の保存に失敗しました。");
      }
      setPostUrls(data.settings.postUrls);
      setSavedPostUrls(data.settings.postUrls);
      setMessage("保存しました。トップページを再読み込みすると反映されます。");
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "Instagram表示設定の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const changed = postUrls.some((url, index) => url !== savedPostUrls[index]);

  return (
    <section className="mb-5 rounded-[22px] border border-pink/10 bg-white p-4 shadow-soft sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[0.14em] text-pink">HOMEPAGE EMBEDS</p>
          <h2 className="mt-1 font-display text-[22px] font-semibold text-ink">
            トップページに表示する投稿
          </h2>
          <p className="mt-2 text-[11px] font-bold leading-5 text-ink/50">
            Instagramで投稿を開き、「リンクをコピー」で取得したURLを2件登録してください。
          </p>
        </div>
        <span className="w-fit rounded-full bg-pink/[0.07] px-3 py-1.5 text-[9px] font-black text-pink">
          PC 2件・スマホ 1件
        </span>
      </div>

      {setupError && (
        <p className="mt-4 rounded-xl border border-[#efd59a] bg-[#fff9ea] px-4 py-3 text-[11px] font-bold leading-5 text-[#76582f]">
          {setupError}
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {postUrls.map((url, index) => {
          let previewUrl = "";
          try {
            previewUrl = normalizeInstagramPostUrl(url);
          } catch {
            previewUrl = "";
          }
          return (
            <label key={index} className="block">
              <span className="text-[11px] font-black text-ink">投稿URL {index + 1}</span>
              <span className="mt-2 flex items-center gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(event) => updateUrl(index, event.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  aria-label={`Instagram投稿URL ${index + 1}`}
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-ink/10 px-3 text-[11px] font-bold text-ink outline-none transition focus:border-pink"
                />
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`投稿${index + 1}をInstagramで確認`}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-ink/10 text-ink/35 transition hover:border-pink/30 hover:text-pink"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
              </span>
            </label>
          );
        })}
      </div>

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
          disabled={saving || Boolean(setupError) || !changed}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink px-5 text-[11px] font-black text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            : <Save size={15} aria-hidden="true" />}
          {saving ? "保存中…" : "表示設定を保存"}
        </button>
      </div>
    </section>
  );
}
