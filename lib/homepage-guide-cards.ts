export type HomepageGuideCard = {
  title: string;
  url: string;
  description: string;
};

export const defaultHomepageGuideCards: HomepageGuideCard[] = [
  {
    title: "初めての方へ",
    url: "/articles/series/first-visit-guide",
    description: "来園前の準備と、一日の楽しみ方を知る。",
  },
  {
    title: "整理券・ハーモニーパス",
    url: "/articles/harmonyland-fan-studio-harmony-pass-guide",
    description: "無料整理券との違いや、購入方法を確認する。",
  },
  {
    title: "パレードの観覧場所",
    url: "/articles/harmonyland-parade-seat-guide",
    description: "有料席・無料席・立ち見から、自分に合う場所を選ぶ。",
  },
];

export function normalizeHomepageGuideUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("URLを入力してください。");
  const url = value.trim();
  if (!url || url.length > 2048 || /[\s\\\u0000-\u001f\u007f]/u.test(url)) {
    throw new Error("URLは2,048文字以内で、空白を含めずに入力してください。");
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    const parsed = new URL(url, "https://harmonypalette.jp");
    if (parsed.origin === "https://harmonypalette.jp") return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return parsed.href;
  } catch {
    // The user-facing validation message below covers invalid and unsafe URLs.
  }
  throw new Error("URLは「/articles/...」などのサイト内パス、またはhttps://で始まるURLを入力してください。");
}

export function normalizeHomepageGuideCards(value: unknown): HomepageGuideCard[] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error("ガイドカードは3件登録してください。");
  }
  return value.map((item: unknown, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`カード${index + 1}の内容を確認してください。`);
    }
    const card = item as Record<string, unknown>;
    const title = typeof card.title === "string" ? card.title.trim() : "";
    const description = typeof card.description === "string" ? card.description.trim() : "";
    if (!title || title.length > 80) throw new Error(`カード${index + 1}の見出しは1〜80文字で入力してください。`);
    if (!description || description.length > 180) throw new Error(`カード${index + 1}の説明文は1〜180文字で入力してください。`);
    return { title, url: normalizeHomepageGuideUrl(card.url), description };
  });
}

export function createDefaultHomepageGuideCards() {
  return defaultHomepageGuideCards.map((card) => ({ ...card }));
}
