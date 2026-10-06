export type RakutenCredentials = {
  applicationId: string;
  accessKey: string;
  affiliateId: string;
};

export type RakutenSettingsStatus = {
  hasApplicationId: boolean;
  hasAccessKey: boolean;
  hasAffiliateId: boolean;
  configured: boolean;
  updatedAt: string | null;
};

export type RakutenConnectionResult = {
  itemCount: number;
  itemNames: string[];
  affiliateReady: boolean;
  testedAt: string;
};

export class RakutenSettingsError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "RakutenSettingsError";
  }
}

export const emptyRakutenStatus: RakutenSettingsStatus = {
  hasApplicationId: false, hasAccessKey: false, hasAffiliateId: false,
  configured: false, updatedAt: null,
};

const fieldLabels: Record<keyof RakutenCredentials, string> = {
  applicationId: "アプリID", accessKey: "アクセスキー", affiliateId: "アフィリエイトID",
};

// Blank fields mean "keep the stored value", never "erase the credential".
export function parseRakutenSettingsPatch(value: unknown): Partial<RakutenCredentials> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RakutenSettingsError("入力内容を確認してください。");
  }
  const input = value as Record<string, unknown>;
  const patch: Partial<RakutenCredentials> = {};
  for (const field of Object.keys(fieldLabels) as (keyof RakutenCredentials)[]) {
    const raw = input[field];
    if (raw === undefined) continue;
    if (typeof raw !== "string") throw new RakutenSettingsError(`${fieldLabels[field]}を確認してください。`);
    const normalized = raw.trim();
    if (!normalized) continue;
    const validCharacters = field === "accessKey" ? /^[\x21-\x7e]+$/.test(normalized) : /^[A-Za-z0-9._-]+$/.test(normalized);
    if (normalized.length > 512 || !validCharacters) {
      throw new RakutenSettingsError(`${fieldLabels[field]}は楽天の取得画面の値をそのまま入力してください。`);
    }
    patch[field] = normalized;
  }
  return patch;
}

export function mergeRakutenCredentials(
  current: RakutenCredentials,
  patch: Partial<RakutenCredentials>,
): RakutenCredentials {
  if (current.applicationId && patch.applicationId && patch.applicationId !== current.applicationId && !patch.accessKey) {
    throw new RakutenSettingsError("アプリIDを変更する場合は、同じアプリのアクセスキーも入力してください。");
  }
  const merged = { ...current, ...patch };
  if (!merged.applicationId) throw new RakutenSettingsError("アプリIDを入力してください。");
  if (!merged.accessKey) throw new RakutenSettingsError("アクセスキーを入力してください。");
  return merged;
}

export function rakutenSettingsStatus(
  credentials: RakutenCredentials,
  updatedAt: string | null,
): RakutenSettingsStatus {
  return {
    hasApplicationId: Boolean(credentials.applicationId),
    hasAccessKey: Boolean(credentials.accessKey),
    hasAffiliateId: Boolean(credentials.affiliateId),
    configured: Boolean(credentials.applicationId && credentials.accessKey),
    updatedAt,
  };
}
