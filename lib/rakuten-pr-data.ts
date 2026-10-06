import "server-only";

import { unstable_cache } from "next/cache";
import { getRakutenProduct } from "@/lib/rakuten-api";
import { getRakutenSettings } from "@/lib/rakuten-settings";
import { getRakutenPrPlacement } from "@/lib/rakuten-pr-settings";
import { createRakutenPrDisplay, getRakutenPrDefinition, RAKUTEN_PR_PRODUCTS_CACHE_TAG, type RakutenPrPlacement } from "@/lib/rakuten-pr";
import { RakutenSettingsError } from "@/lib/rakuten-settings-input";
import type { RakutenProduct } from "@/lib/rakuten-products";

// Only item codes enter the cache key. Credentials never become cache arguments.
const cachedProduct = unstable_cache(async (itemCode: string) => {
  const settings = await getRakutenSettings();
  return getRakutenProduct(settings, itemCode);
}, ["rakuten-pr-product-20260701"], { revalidate: 3600, tags: [RAKUTEN_PR_PRODUCTS_CACHE_TAG] });

export async function getRakutenPrProducts(placements: Pick<RakutenPrPlacement, "items">[]) {
  const codes = [...new Set(placements.flatMap((placement) => placement.items.map((item) => item.itemCode)))];
  const products: RakutenProduct[] = [];
  let productError = "";
  for (const code of codes) {
    try {
      const product = await cachedProduct(code);
      if (product) products.push(product);
    } catch (error) {
      productError = error instanceof RakutenSettingsError ? error.message : "商品情報を取得できませんでした。時間をおいて再読み込みしてください。";
      // Stop a provider outage from issuing another request for every slot.
      break;
    }
  }
  return { products, productError };
}

export async function getPublicRakutenPrPlacement(placementId: string) {
  try {
    const placement = await getRakutenPrPlacement(getRakutenPrDefinition(placementId));
    if (!placement.enabled || !placement.items.length) return null;
    const { products } = await getRakutenPrProducts([placement]);
    return createRakutenPrDisplay(placement, products);
  } catch {
    // An optional PR block must not prevent the rest of the page from rendering.
    return null;
  }
}
