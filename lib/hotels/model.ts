export type HotelStatus = "draft" | "published" | "archived";
export type HotelMaster = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};
export type HotelBookingLink = {
  id: string;
  provider: string;
  label: string;
  url: string;
  primary: boolean;
};
export type HotelImage = {
  id: string;
  path: string;
  url: string;
  kind: "upload" | "rakuten";
  alt: string;
  credit: string;
  license: string;
  expiresOn: string | null;
  bookingLinkId: string;
};
export const FACT_LABELS = {
  parking: "駐車場",
  checkIn: "チェックイン",
  checkOut: "チェックアウト",
  bedSharing: "子どもの添い寝",
  japaneseRoom: "和室",
  bedGuard: "ベッドガード",
  bath: "温泉・大浴場",
  meals: "食事・朝食",
  nearby: "周辺の飲食店・コンビニ",
} as const;
export type HotelFacts = Record<keyof typeof FACT_LABELS, string>;
export type HotelSource = { label: string; url: string; checkedOn: string };
export type Hotel = {
  id: string;
  slug: string;
  articleId: string;
  name: string;
  areaId: string;
  address: string;
  officialUrl: string;
  status: HotelStatus;
  deletedAt: string | null;
  updatedAt: string;
  summary: string;
  highlight: string;
  whyStay: string;
  familyNotes: string;
  morningNotes: string;
  nightNotes: string;
  audience: string;
  driveMinutes: number | null;
  driveMinutesMax: number | null;
  driveNote: string;
  driveSourceUrl: string;
  driveCheckedOn: string | null;
  verifiedOn: string | null;
  facts: HotelFacts;
  sources: HotelSource[];
  sortOrder: number;
  recommended: boolean;
  allowIndex: boolean;
  seoTitle: string;
  seoDescription: string;
  prEnabled: boolean;
  prStartsAt: string | null;
  prEndsAt: string | null;
  prOrder: number;
  disclosure: string;
  tagIds: string[];
  images: HotelImage[];
  bookingLinks: HotelBookingLink[];
};
export type HotelCatalog = {
  hotels: Hotel[];
  areas: HotelMaster[];
  tags: HotelMaster[];
  available: boolean;
  articles?: HotelArticle[];
};
export type HotelArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
};

export function hotelArticle(
  hotel: Pick<Hotel, "articleId">,
  articles: HotelArticle[] = [],
  now = Date.now(),
) {
  if (!hotel.articleId) return undefined;
  return articles.find((article) =>
    article.id === hotel.articleId &&
    article.status === "published" &&
    article.slug &&
    article.publishedAt &&
    Date.parse(article.publishedAt) <= now,
  );
}
export function hotelArticlePath(article: Pick<HotelArticle, "slug">) {
  return `/articles/${encodeURIComponent(article.slug)}`;
}
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BOOKING_PROVIDERS: Record<string, string> = {
  rakuten: "楽天トラベル",
  jalan: "じゃらん",
  yahoo: "Yahoo!トラベル",
  ikyu: "一休.com",
  booking: "Booking.com",
  other: "宿泊予約サイト",
};
export function emptyHotel(id: string): Hotel {
  return {
    id,
    slug: "",
    articleId: "",
    name: "",
    areaId: "hiji",
    address: "",
    officialUrl: "",
    status: "draft",
    deletedAt: null,
    updatedAt: "",
    summary: "",
    highlight: "",
    whyStay: "",
    familyNotes: "",
    morningNotes: "",
    nightNotes: "",
    audience: "",
    driveMinutes: null,
    driveMinutesMax: null,
    driveNote: "",
    driveSourceUrl: "",
    driveCheckedOn: null,
    verifiedOn: null,
    facts: Object.fromEntries(
      Object.keys(FACT_LABELS).map((key) => [key, ""]),
    ) as HotelFacts,
    sources: [],
    sortOrder: 100,
    recommended: false,
    allowIndex: false,
    seoTitle: "",
    seoDescription: "",
    prEnabled: false,
    prStartsAt: null,
    prEndsAt: null,
    prOrder: 100,
    disclosure: "",
    tagIds: [],
    images: [],
    bookingLinks: [],
  };
}
function text(value: unknown, max = 2000, required = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error("入力内容・文字数を確認してください。");
  return value.trim();
}
export function safeHotelUrl(value: unknown, required = false): string {
  const result = text(value, 4000, required);
  if (!result) return "";
  let url: URL;
  try {
    url = new URL(result);
  } catch {
    throw new Error("URLを確認してください。");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("URLは認証情報を含まないhttps形式にしてください。");
  return result;
}
export function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
function day(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = text(value, 10);
  if (!validDay(s)) throw new Error("確認日・掲載期限を確認してください。");
  return s;
}
function instant(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = text(value, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s) ||
    !validDay(s.slice(0, 10)) ||
    !Number.isFinite(Date.parse(s))
  )
    throw new Error("PR日時にはタイムゾーンを指定してください。");
  return new Date(s).toISOString();
}
function integer(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error("数値の範囲を確認してください。");
  return value;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error("登録件数の上限を確認してください。");
  return value;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("入力形式を確認してください。");
  return value as Record<string, unknown>;
}
function id(value: unknown) {
  const s = text(value, 36, true);
  if (!UUID_RE.test(s)) throw new Error("IDの形式を確認してください。");
  return s;
}
export function parseHotel(value: unknown): Hotel {
  const v = object(value);
  const result = emptyHotel(id(v.id));
  result.articleId = v.articleId == null || v.articleId === "" ? "" : id(v.articleId);
  result.slug = text(v.slug, 100, true);
  if (!KEY_RE.test(result.slug))
    throw new Error("ホテルURLは半角英数字とハイフンで入力してください。");
  result.name = text(v.name, 160, true);
  result.areaId = text(v.areaId, 80, true);
  if (!KEY_RE.test(result.areaId))
    throw new Error("エリアを確認してください。");
  if (!["draft", "published", "archived"].includes(String(v.status)))
    throw new Error("公開状態を確認してください。");
  result.status = v.status as HotelStatus;
  for (const key of [
    "summary",
    "highlight",
    "whyStay",
    "familyNotes",
    "morningNotes",
    "nightNotes",
    "audience",
    "driveNote",
    "disclosure",
  ] as const)
    result[key] = text(v[key], key === "highlight" ? 240 : 4000);
  result.address = text(v.address, 300);
  result.officialUrl = safeHotelUrl(v.officialUrl);
  result.seoTitle = text(v.seoTitle, 160);
  result.seoDescription = text(v.seoDescription, 320);
  result.sortOrder = integer(v.sortOrder, 0, 100000);
  result.prOrder = integer(v.prOrder, 0, 100000);
  result.driveMinutes =
    v.driveMinutes == null ? null : integer(v.driveMinutes, 1, 600);
  result.driveMinutesMax =
    v.driveMinutesMax == null ? null : integer(v.driveMinutesMax, 1, 600);
  result.driveSourceUrl = safeHotelUrl(v.driveSourceUrl);
  result.driveCheckedOn = day(v.driveCheckedOn);
  result.verifiedOn = day(v.verifiedOn);
  if (
    result.driveMinutesMax != null &&
    (result.driveMinutes == null ||
      result.driveMinutesMax < result.driveMinutes)
  )
    throw new Error("所要時間の上限を確認してください。");
  if (
    result.driveMinutes != null &&
    (!result.driveSourceUrl || !result.driveCheckedOn)
  )
    throw new Error("所要時間には確認元URLと確認日が必要です。");
  for (const key of ["recommended", "allowIndex", "prEnabled"] as const) {
    if (typeof v[key] !== "boolean")
      throw new Error("設定値を確認してください。");
    result[key] = v[key];
  }
  // Legacy detail-page SEO fields remain readable, but hotel content now lives in articles.
  result.allowIndex = false;
  result.prStartsAt = instant(v.prStartsAt);
  result.prEndsAt = instant(v.prEndsAt);
  if (
    result.prEnabled &&
    (!result.prStartsAt || !result.prEndsAt || !result.disclosure)
  )
    throw new Error("PRには開始・終了日時と広告説明が必要です。");
  if (
    result.prStartsAt &&
    result.prEndsAt &&
    result.prStartsAt >= result.prEndsAt
  )
    throw new Error("PR終了日時は開始日時より後にしてください。");
  const facts = object(v.facts);
  for (const key of Object.keys(FACT_LABELS) as (keyof HotelFacts)[])
    result.facts[key] = text(facts[key], 1500);
  result.tagIds = [
    ...new Set(array(v.tagIds, 30).map((x) => text(x, 80, true))),
  ];
  if (result.tagIds.some((x) => !KEY_RE.test(x)))
    throw new Error("特徴タグを確認してください。");
  result.sources = array(v.sources, 20).map((x) => {
    const s = object(x);
    const checkedOn = day(s.checkedOn);
    if (!checkedOn) throw new Error("出典には確認日が必要です。");
    return {
      label: text(s.label, 100, true),
      url: safeHotelUrl(s.url, true),
      checkedOn,
    };
  });
  result.bookingLinks = array(v.bookingLinks, 10).map((x) => {
    const b = object(x);
    const provider = text(b.provider, 50, true);
    if (!KEY_RE.test(provider))
      throw new Error("予約サービスの識別子を確認してください。");
    return {
      id: id(b.id),
      provider,
      label: text(b.label, 80, true),
      url: safeHotelUrl(b.url, true),
      primary: b.primary === true,
    };
  });
  if (
    new Set(result.bookingLinks.map((b) => b.id)).size !==
      result.bookingLinks.length ||
    result.bookingLinks.filter((b) => b.primary).length > 1
  )
    throw new Error("予約リンクIDの重複・主ボタンの設定を確認してください。");
  result.images = array(v.images, 12).map((x) => {
    const p = object(x);
    if (p.kind !== "upload" && p.kind !== "rakuten")
      throw new Error("画像形式を確認してください。");
    const image: HotelImage = {
      id: id(p.id),
      path: text(p.path, 100),
      url: text(p.url, 4000),
      kind: p.kind,
      alt: text(p.alt, 200, true),
      credit: text(p.credit, 200, true),
      license: text(p.license, 500, true),
      expiresOn: day(p.expiresOn),
      bookingLinkId: text(p.bookingLinkId, 36),
    };
    if (image.kind === "upload") {
      if (!/^[a-f0-9-]{36}\.webp$/.test(image.path) || image.url)
        throw new Error("写真を管理画面からアップロードしてください。");
    } else {
      const url = new URL(safeHotelUrl(image.url, true));
      if (
        url.hostname !== "hbb.afl.rakuten.co.jp" ||
        !url.pathname.startsWith("/hgb/") ||
        !result.bookingLinks.some(
          (b) =>
            b.id === image.bookingLinkId &&
            b.provider === "rakuten" &&
            new URL(b.url).hostname === "hb.afl.rakuten.co.jp",
        )
      )
        throw new Error(
          "楽天の画像には対応する楽天アフィリエイトリンクが必要です。",
        );
      if (image.path)
        throw new Error("楽天画像は外部素材URLを使用してください。");
    }
    return image;
  });
  if (new Set(result.images.map((p) => p.id)).size !== result.images.length)
    throw new Error("画像IDが重複しています。");
  result.updatedAt =
    typeof v.updatedAt === "string" ? text(v.updatedAt, 40) : "";
  if (
    result.status === "published" &&
    (!result.summary ||
      !result.highlight ||
      !result.officialUrl ||
      !result.verifiedOn)
  )
    throw new Error(
      "公開には紹介文・おすすめポイント・公式URL・最終確認日が必要です。",
    );
  return result;
}
export function isActivePr(h: Hotel, now: number) {
  return (
    h.status === "published" &&
    !h.deletedAt &&
    h.prEnabled &&
    !!h.prStartsAt &&
    !!h.prEndsAt &&
    Date.parse(h.prStartsAt) <= now &&
    now < Date.parse(h.prEndsAt)
  );
}
export function prState(h: Hotel, now: number) {
  return !h.prEnabled
    ? "設定なし"
    : !h.prStartsAt || !h.prEndsAt
      ? "設定不備"
      : now < Date.parse(h.prStartsAt)
        ? "予約中"
        : now >= Date.parse(h.prEndsAt)
          ? "終了"
          : "掲載中";
}
export function driveLabel(h: Pick<Hotel, "driveMinutes" | "driveMinutesMax">) {
  return h.driveMinutes == null
    ? "所要時間未確認"
    : `車で約${h.driveMinutes}${h.driveMinutesMax && h.driveMinutesMax !== h.driveMinutes ? `〜${h.driveMinutesMax}` : ""}分`;
}
export function hotelImageUrl(
  hotelId: string,
  image: HotelImage,
  thumb = false,
) {
  return image.kind === "rakuten"
    ? image.url
    : `/api/hotels/${hotelId}/images/${image.id}${thumb ? "?size=card" : ""}`;
}
export function currentImages(h: Hotel, now = new Date()) {
  const day = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(now);
  return h.images.filter((p) => !p.expiresOn || p.expiresOn >= day);
}
export function filterHotels(
  hotels: Hotel[],
  areas: string[],
  tags: string[],
  order: string,
) {
  return hotels
    .filter(
      (h) =>
        h.status === "published" &&
        !h.deletedAt &&
        (!areas.length || areas.includes(h.areaId)) &&
        tags.every((t) =>
          t === "nearby"
            ? h.driveMinutes != null &&
              (h.driveMinutesMax ?? h.driveMinutes) <= 20
            : h.tagIds.includes(t),
        ),
    )
    .sort(
      (a, b) =>
        (order === "near"
          ? (a.driveMinutesMax ?? a.driveMinutes ?? Infinity) -
            (b.driveMinutesMax ?? b.driveMinutes ?? Infinity)
          : a.sortOrder - b.sortOrder) ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name, "ja"),
    );
}
export function parseHotelMaster(value: unknown): HotelMaster {
  const v = object(value);
  const key = text(v.id, 80, true);
  if (!KEY_RE.test(key))
    throw new Error("識別子は半角英数字とハイフンで入力してください。");
  return {
    id: key,
    name: text(v.name, 80, true),
    sortOrder: integer(v.sortOrder, 0, 100000),
    active: v.active === true,
  };
}
