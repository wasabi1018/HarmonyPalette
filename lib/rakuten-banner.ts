import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

export type RakutenBannerPlacement = {
  placementId: string;
  enabled: boolean;
  linkUrl: string;
  imageUrl: string;
  alt: string;
  width: number;
  height: number;
  updatedAt: string | null;
};
export type RakutenBannerDefinition = {
  id: string;
  label: string;
  location: string;
  revalidatePaths: readonly string[];
  defaultBanner?: Pick<RakutenBannerPlacement, "linkUrl" | "imageUrl" | "alt" | "width" | "height">;
};

export const RAKUTEN_BANNER_PLACEMENTS: readonly RakutenBannerDefinition[] = [{
  id: "home-between-articles-birthday",
  label: "TOPの楽天バナー",
  location: "最新記事の下・誕生日欄の前",
  revalidatePaths: ["/"],
  defaultBanner: {
    linkUrl: "https://hb.afl.rakuten.co.jp/hsc/583c7758.af2ff55c.56d09dec.cb2cfcda/?link_type=pict&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJwaWN0IiwiY29sIjoxLCJjYXQiOiI0NCIsImJhbiI6Mjc5NDg4MywiYW1wIjpmYWxzZX0%3D",
    imageUrl: "https://hbb.afl.rakuten.co.jp/hsb/583c7758.af2ff55c.56d09dec.cb2cfcda/?me_id=1&me_adv_id=2794883&t=pict",
    alt: "楽天市場のおすすめ情報",
    width: 468, height: 60,
  },
}];

export function getRakutenBannerDefinition(id: string) {
  const definition = RAKUTEN_BANNER_PLACEMENTS.find((entry) => entry.id === id);
  if (!definition) throw new RakutenSettingsError("バナーの掲載場所が見つかりません。", 404);
  return definition;
}

export function createDefaultRakutenBanner(definition: RakutenBannerDefinition): RakutenBannerPlacement {
  return {
    placementId: definition.id, enabled: Boolean(definition.defaultBanner),
    linkUrl: "", imageUrl: "", alt: "楽天市場のおすすめ情報", width: 468, height: 60,
    ...definition.defaultBanner, updatedAt: null,
  };
}

function bannerUrl(value: unknown, image: boolean, required: boolean) {
  const label = image ? "画像URL" : "リンク先URL";
  if (typeof value !== "string") throw new RakutenSettingsError(`${label}を入力してください。`);
  const trimmed = value.trim();
  if (!trimmed && !required) return "";
  if (trimmed.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(trimmed)) throw new RakutenSettingsError(`${label}を確認してください。`);
  try {
    const url = new URL(trimmed);
    const hosts = image ? ["hbb.afl.rakuten.co.jp", "ba.afl.rakuten.co.jp"] : ["hb.afl.rakuten.co.jp"];
    if (url.protocol !== "https:" || url.username || url.password || url.port || !hosts.includes(url.hostname)) throw new Error("Invalid banner URL");
    // Keep the original encoded affiliate parameters exactly as supplied.
    return trimmed;
  } catch { throw new RakutenSettingsError(`${label}には楽天アフィリエイトのHTTPS URLを入力してください。`); }
}

export function parseRakutenBanner(value: unknown, definition: RakutenBannerDefinition): RakutenBannerPlacement {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RakutenSettingsError("バナーの掲載内容を確認してください。");
  const input = value as Record<string, unknown>;
  if (typeof input.enabled !== "boolean") throw new RakutenSettingsError("公開表示の設定を確認してください。");
  if (typeof input.alt !== "string" || !input.alt.trim() || input.alt.trim().length > 160 || /[\u0000-\u001f\u007f]/.test(input.alt)) {
    throw new RakutenSettingsError("画像の説明を1〜160文字で入力してください。");
  }
  if (![input.width, input.height].every((size) => typeof size === "number" && Number.isInteger(size) && size >= 1 && size <= 4000)) {
    throw new RakutenSettingsError("バナー画像のサイズを確認してください。");
  }
  return {
    placementId: definition.id, enabled: input.enabled,
    linkUrl: bannerUrl(input.linkUrl, false, input.enabled), imageUrl: bannerUrl(input.imageUrl, true, input.enabled),
    alt: input.alt.trim(), width: input.width as number, height: input.height as number,
    updatedAt: typeof input.updatedAt === "string" && Number.isFinite(Date.parse(input.updatedAt)) ? input.updatedAt : null,
  };
}
