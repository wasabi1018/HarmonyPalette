export const instagramTools = [
  { id: "crowd-calendar", title: "混雑予想", description: "公開中の混雑予想カレンダーから、天気やトピックスを含む投稿画像を生成します。", detail: "公開カレンダーから画像生成", icon: "calendar" },
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
