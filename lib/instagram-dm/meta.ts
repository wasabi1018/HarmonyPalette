import "server-only";

import { postbackPayload } from "@/lib/instagram-dm/domain";

export function getMetaConfig() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  const graphVersion = process.env.INSTAGRAM_GRAPH_VERSION;
  const username = process.env.INSTAGRAM_USERNAME;
  if (!accountId || !token || !appSecret || !verifyToken || !graphVersion || !username) return null;
  if (!/^v\d+\.\d+$/.test(graphVersion) || !/^\w[\w.]*$/.test(username)) return null;
  return { accountId, token, appSecret, verifyToken, graphVersion, username };
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly uncertain = false,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

async function metaRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getMetaConfig();
  if (!config) throw new MetaApiError("Instagramの環境変数が不足しています。", 503);
  let response: Response;
  try {
    response = await fetch(`https://graph.instagram.com/${config.graphVersion}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new MetaApiError("Meta APIの応答を確認できませんでした。", 0, true);
  }
  const json = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const metaError = json.error as Record<string, unknown> | undefined;
    const code = typeof metaError?.code === "number" ? metaError.code : null;
    throw new MetaApiError(
      `Meta API ${response.status}: ${String(metaError?.message || "request failed")}`,
      response.status,
      response.status >= 500,
      response.status === 429 || [4, 17, 32, 613].includes(code ?? -1),
    );
  }
  return json as T;
}

async function sendMessage(recipient: Record<string, string>, message: object) {
  const config = getMetaConfig();
  if (!config) throw new MetaApiError("Instagramの環境変数が不足しています。", 503);
  return metaRequest<{ message_id: string }>(`${config.accountId}/messages`, {
    method: "POST",
    body: JSON.stringify({ recipient, message }),
  });
}

export async function sendIntro(commentId: string, deliveryId: string, characterName: string) {
  return sendMessage({ comment_id: commentId }, {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: `${characterName}のおすすめ日ランキングをご用意しました。受け取るには下のボタンを押してください。`,
        buttons: [{ type: "postback", title: "ランキングを受け取る", payload: postbackPayload("OPEN", deliveryId) }],
      },
    },
  });
}

export async function sendFollowPrompt(userId: string, deliveryId: string) {
  const config = getMetaConfig();
  if (!config) throw new MetaApiError("Instagramの環境変数が不足しています。", 503);
  return sendMessage({ id: userId }, {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [{
          title: "フォロー後にランキングを受け取れます",
          subtitle: "フォローしてから「フォローしました」を押してください。",
          buttons: [
            { type: "web_url", title: "プロフィールを開く", url: `https://www.instagram.com/${config.username}/` },
            { type: "postback", title: "フォローしました", payload: postbackPayload("CHECK", deliveryId) },
          ],
        }],
      },
    },
  });
}

export async function checkFollowing(userId: string): Promise<"following" | "not_following" | "unknown"> {
  const result = await metaRequest<{ is_user_follow_business?: boolean }>(
    `${encodeURIComponent(userId)}?fields=is_user_follow_business`,
  ).catch(() => null);
  if (result?.is_user_follow_business === true) return "following";
  if (result?.is_user_follow_business === false) return "not_following";
  return "unknown";
}

export async function sendImage(userId: string, url: string) {
  return sendMessage({ id: userId }, { attachment: { type: "image", payload: { url } } });
}

export async function sendText(userId: string, message: string) {
  return sendMessage({ id: userId }, { text: message });
}

export async function replyToComment(commentId: string) {
  return metaRequest<{ id: string }>(`${encodeURIComponent(commentId)}/replies`, {
    method: "POST",
    body: JSON.stringify({ message: "DMでお送りしました！" }),
  });
}
