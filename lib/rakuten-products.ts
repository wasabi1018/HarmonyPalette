import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

export type RakutenProduct = {
  itemCode: string;
  itemName: string;
  imageUrl: string;
  itemUrl: string;
  affiliateUrl: string | null;
  shopName: string;
};

export type RakutenProductSearchResult = {
  products: RakutenProduct[];
  page: number;
  pageCount: number;
  totalCount: number;
};

export function isRakutenItemCode(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && /^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(value);
}

function safeUrl(value: unknown, allowedHost: (host: string) => boolean): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && allowedHost(url.hostname)
      ? value : null;
  } catch { return null; }
}

export function normalizeRakutenProduct(value: unknown): RakutenProduct | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const wrapper = value as Record<string, unknown>;
  const raw = wrapper.Item ?? wrapper.item ?? wrapper;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  if (!isRakutenItemCode(item.itemCode) || typeof item.itemName !== "string" || !item.itemName.trim() || item.itemName.length > 2000) return null;
  if (item.availability !== undefined && item.availability !== 1 && item.availability !== "1") return null;
  const imageUrls = Array.isArray(item.mediumImageUrls) ? item.mediumImageUrls : [];
  let imageUrl: string | null = null;
  for (const entry of imageUrls) {
    const candidate = typeof entry === "string" ? entry
      : entry && typeof entry === "object" ? (entry as Record<string, unknown>).imageUrl : null;
    imageUrl = safeUrl(candidate, (host) => host === "image.rakuten.co.jp" || host.endsWith(".image.rakuten.co.jp") || host === "r10s.jp" || host.endsWith(".r10s.jp"));
    if (imageUrl) break;
  }
  const itemUrl = safeUrl(item.itemUrl, (host) => host === "item.rakuten.co.jp" || host === "hb.afl.rakuten.co.jp");
  if (!imageUrl || !itemUrl) return null;
  return {
    itemCode: item.itemCode, itemName: item.itemName, imageUrl, itemUrl,
    affiliateUrl: safeUrl(item.affiliateUrl, (host) => host === "hb.afl.rakuten.co.jp"),
    shopName: typeof item.shopName === "string" ? item.shopName.slice(0, 200) : "",
  };
}

export function parseRakutenProductSearch(keyword: unknown, page: unknown) {
  if (typeof keyword !== "string" || keyword.trim().length < 2 || keyword.trim().length > 120) {
    throw new RakutenSettingsError("商品名やキーワードを2〜120文字で入力してください。");
  }
  const pageNumber = typeof page === "string" && /^\d+$/.test(page) ? Number(page) : typeof page === "number" ? page : NaN;
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 100) {
    throw new RakutenSettingsError("検索ページを確認してください。");
  }
  return { keyword: keyword.trim(), page: pageNumber };
}
