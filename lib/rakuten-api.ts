import "server-only";

import { SITE_URL } from "@/lib/site-config";
import { RakutenSettingsError, type RakutenConnectionResult, type RakutenCredentials } from "@/lib/rakuten-settings-input";

export function getRakutenSiteOrigin() {
  return new URL(SITE_URL).origin;
}

export async function testRakutenConnection(settings: RakutenCredentials): Promise<RakutenConnectionResult> {
  const url = new URL("https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701");
  url.search = new URLSearchParams({
    applicationId: settings.applicationId, format: "json", formatVersion: "2",
    keyword: "タオル", hits: "3", imageFlag: "1", availability: "1", elements: "itemName,affiliateUrl",
    ...(settings.affiliateId ? { affiliateId: settings.affiliateId } : {}),
  }).toString();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accessKey: settings.accessKey, Referer: `${getRakutenSiteOrigin()}/`, Origin: getRakutenSiteOrigin() },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Never forward fetch errors: they may include the request URL or credentials.
    throw new RakutenSettingsError("楽天APIへ接続できませんでした。時間をおいて再度お試しください。", 502);
  }
  if (!response.ok) {
    const message = response.status === 429
      ? "楽天APIの利用回数上限に達しました。時間をおいて再度お試しください。"
      : response.status === 401 || response.status === 403 || response.status === 400
        ? "楽天APIが接続を受け付けませんでした。アプリID・アクセスキー・楽天側の許可サイトとAPI利用権限を確認してください。"
        : "楽天APIから商品情報を取得できませんでした。時間をおいて再度お試しください。";
    throw new RakutenSettingsError(message, 502);
  }
  let body: Record<string, unknown>;
  try { body = await response.json(); }
  catch { throw new RakutenSettingsError("楽天APIの応答を読み込めませんでした。", 502); }
  if (!body || typeof body !== "object" || body.error) throw new RakutenSettingsError("楽天APIの応答を確認できませんでした。設定内容を確認してください。", 502);
  const items = body.Items ?? body.items;
  if (!Array.isArray(items)) throw new RakutenSettingsError("楽天APIから商品一覧を取得できませんでした。", 502);
  const products = items.slice(0, 3).map((entry: unknown) => {
    if (!entry || typeof entry !== "object") return null;
    const wrapper = entry as Record<string, unknown>;
    const item = wrapper.Item ?? wrapper.item ?? wrapper;
    if (!item || typeof item !== "object") return null;
    const product = item as Record<string, unknown>;
    return typeof product.itemName === "string" ? product : null;
  }).filter((item): item is Record<string, unknown> => item !== null);
  if (items.length && !products.length) throw new RakutenSettingsError("楽天APIの商品情報を読み込めませんでした。", 502);
  return {
    itemCount: products.length,
    itemNames: products.map((item) => (item.itemName as string).slice(0, 300)),
    affiliateReady: Boolean(settings.affiliateId) && products.length > 0 && products.every((item) => {
      if (typeof item.affiliateUrl !== "string") return false;
      try {
        const link = new URL(item.affiliateUrl);
        return link.protocol === "https:" && link.hostname === "hb.afl.rakuten.co.jp";
      } catch { return false; }
    }),
    testedAt: new Date().toISOString(),
  };
}
