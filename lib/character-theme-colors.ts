const DEFAULT_CHARACTER_THEME_COLOR = "#ef8099";

/**
 * Character colors use the same soft, medium-light tone as the five established
 * colors for Hello Kitty, Pompompurin, My Melody, Cinnamoroll, and Kuromi.
 */
export const CHARACTER_THEME_COLORS = {
  "ハローキティ": "#ef8099",
  "ポムポムプリン": "#f4cf7b",
  "マイメロディ": "#f7a6bd",
  "シナモロール": "#9ecde8",
  "クロミ": "#b99bd5",
  "ポチャッコ": "#8fc5dc",
  "キキ": "#8fbce2",
  "ララ": "#eea0c5",
  "ディアダニエル": "#86b7d9",
  "あひるのペックル": "#f0bd72",
  "いちごの王さま": "#e98ba4",
  "ウィッシュミーメル": "#d6add5",
  "ウサハナ": "#ee9d9d",
  "エスプレッソ": "#bca186",
  "カプチーノ": "#d7b68e",
  "くろうさ": "#a99ac7",
  "けろけろけろっぴ": "#87c99c",
  "コロコロクリリン": "#d8b277",
  "シフォン": "#d9a4c7",
  "ジョージ": "#92b9d4",
  "しろうさ": "#b7c4e1",
  "タキシードサム": "#7fb8d8",
  "バッドばつ丸": "#9b96b5",
  "ハローミミィ": "#efc76f",
  "ハンギョドン": "#83c1c9",
  "ぼんぼんりぼん": "#eaa4c5",
  "マイスウィートピアノ": "#e8b0ca",
  "みるく": "#b9d9e8",
  "メアリー": "#d6a1a7",
  "モカ": "#c59a82",
  "モップ": "#cbb693",
  "ルビー": "#e59aaf",
} as const satisfies Record<string, `#${string}`>;

export function getCharacterThemeColor(name: string) {
  return CHARACTER_THEME_COLORS[name as keyof typeof CHARACTER_THEME_COLORS]
    ?? DEFAULT_CHARACTER_THEME_COLOR;
}
