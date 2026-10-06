import { isRakutenItemCode, type RakutenProduct } from "@/lib/rakuten-products";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";

export const RAKUTEN_PR_PRODUCTS_CACHE_TAG = "rakuten-pr-products";

export type RakutenPrPlacementDefinition = {
  id: string;
  label: string;
  location: string;
  itemLimit: number;
  revalidatePaths: readonly string[];
};

// Register a page's placement here; the admin UI and persistence are shared.
export const RAKUTEN_PR_PLACEMENTS: readonly RakutenPrPlacementDefinition[] = [
  { id: "home-pickup", label: "TOPのPICK UP", location: "来園に役立つガイドの下・Instagramの前", itemLimit: 4, revalidatePaths: ["/"] },
];

export type RakutenPrSelection = { itemCode: string; description: string };
export type RakutenPrPlacement = {
  placementId: string;
  enabled: boolean;
  title: string;
  description: string;
  items: RakutenPrSelection[];
  updatedAt: string | null;
};
export type RakutenPrDisplayItem = RakutenProduct & { affiliateUrl: string; description: string };
export type RakutenPrDisplay = Pick<RakutenPrPlacement, "placementId" | "title" | "description"> & { items: RakutenPrDisplayItem[] };

export function getRakutenPrDefinition(id: string) {
  const definition = RAKUTEN_PR_PLACEMENTS.find((entry) => entry.id === id);
  if (!definition) throw new RakutenSettingsError("掲載場所が見つかりません。", 404);
  return definition;
}

export function createDefaultRakutenPrPlacement(definition: RakutenPrPlacementDefinition): RakutenPrPlacement {
  return { placementId: definition.id, enabled: false, title: "PICK UP", description: "気になるアイテムをピックアップ", items: [], updatedAt: null };
}

function text(value: unknown, maxLength: number, label: string, required = false) {
  if (typeof value !== "string" || value.trim().length > maxLength || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new RakutenSettingsError(`${label}を${required ? "1〜" : ""}${maxLength}文字以内で入力してください。`);
  }
  return value.trim();
}

export function parseRakutenPrPlacement(value: unknown, definition: RakutenPrPlacementDefinition): RakutenPrPlacement {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RakutenSettingsError("掲載内容を確認してください。");
  const input = value as Record<string, unknown>;
  if (typeof input.enabled !== "boolean" || !Array.isArray(input.items) || input.items.length > definition.itemLimit) {
    throw new RakutenSettingsError(`掲載商品は${definition.itemLimit}件まで選べます。`);
  }
  const seen = new Set<string>();
  const items = input.items.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new RakutenSettingsError("掲載商品を確認してください。");
    const item = entry as Record<string, unknown>;
    if (!isRakutenItemCode(item.itemCode)) throw new RakutenSettingsError("掲載商品を検索結果から選び直してください。");
    if (seen.has(item.itemCode)) throw new RakutenSettingsError("同じ商品を重複して掲載できません。");
    seen.add(item.itemCode);
    return { itemCode: item.itemCode, description: text(item.description, 80, "商品の紹介文") };
  });
  if (input.enabled && items.length !== definition.itemLimit) {
    throw new RakutenSettingsError(`公開するには商品を${definition.itemLimit}件選んでください。`);
  }
  return {
    placementId: definition.id, enabled: input.enabled,
    title: text(input.title, 80, "見出し", true), description: text(input.description, 160, "説明文"), items,
    updatedAt: typeof input.updatedAt === "string" && Number.isFinite(Date.parse(input.updatedAt)) ? input.updatedAt : null,
  };
}

// Preserve editor order; unavailable items and missing affiliate links stay off public pages.
export function createRakutenPrDisplay(placement: RakutenPrPlacement, products: RakutenProduct[]): RakutenPrDisplay | null {
  if (!placement.enabled) return null;
  const byCode = new Map(products.map((product) => [product.itemCode, product]));
  const items: RakutenPrDisplayItem[] = [];
  for (const selected of placement.items) {
    const product = byCode.get(selected.itemCode);
    if (product?.affiliateUrl) items.push({ ...product, affiliateUrl: product.affiliateUrl, description: selected.description });
  }
  return items.length ? { placementId: placement.placementId, title: placement.title, description: placement.description, items } : null;
}
