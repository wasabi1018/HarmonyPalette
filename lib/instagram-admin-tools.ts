export const instagramTools = [
  { id: "crowd-calendar", title: "混雑予想カレンダー", description: "月ごとの混雑予想を編集して、投稿画像にまとめます。", detail: "月別カレンダー", icon: "calendar" },
  { id: "character-recommendations", title: "推しキャラおすすめ日", description: "キャラクター別のおすすめ日画像とDM文章を作成します。", detail: "画像・DM文章", icon: "heart" },
  { id: "schedule", title: "全体スケジュール", description: "選んだイベントの予定を、週間画像や月分セットにまとめます。", detail: "週間・月分セット", icon: "schedule" },
  { id: "fan-studio-weekly", title: "ファンスタジオ・週間", description: "1週間の登場キャラクターを一覧にします。", detail: "週間・月分セット", icon: "users" },
  { id: "fan-studio-daily", title: "ファンスタジオ・日別", description: "時間と部屋別の予定を、1週間分の日別画像7枚にします。", detail: "日別画像7枚", icon: "images" },
] as const;

export type InstagramToolId = typeof instagramTools[number]["id"];
export const instagramToolHref = (id: InstagramToolId) => `/admin/instagram/create/${id}`;

export function getInstagramTool(id: string) {
  return instagramTools.find((tool) => tool.id === id);
}
