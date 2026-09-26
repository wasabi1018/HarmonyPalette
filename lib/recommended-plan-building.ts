export type RecommendedPlanStep = {
  id: string;
  title: string;
  description: string;
};

export const RECOMMENDED_PLAN_BUILDING = {
  title: "おすすめのプランの立て方",
  introduction:
    "先に時間を動かせない予定を置き、あとから自由に動かせる予定を加えると、無理のないプランを作れます。",
  steps: [
    {
      id: "priorities",
      title: "絶対に外せないものを2〜3個決める",
      description:
        "やりたいことを「絶対」「できれば」「時間があれば」に分け、今回の優先を決めます。全部を最優先にしないのがポイントです。",
    },
    {
      id: "fixed-times",
      title: "時間が決まっている予定を入れる",
      description:
        "パレード、ショー、ビンゴ、グリーティングを開始時刻順に追加します。この予定が一日の軸になります。",
    },
    {
      id: "preparation",
      title: "開始前の準備時間を入れる",
      description:
        "整理券・受付、カード購入、場所取り、移動も予定に加えます。開始前に必要な行動まで考えましょう。",
    },
    {
      id: "meal-break",
      title: "食事と休憩の時間を確保する",
      description:
        "固定予定の間に、食事と休憩を入れます。混雑が気になる日は、昼食を少し早める・遅めることも考えましょう。",
    },
    {
      id: "flexible-time",
      title: "空いた時間に近くの予定を入れる",
      description:
        "残った時間に、近くのアトラクションやショップを追加します。同じエリアでまとめると移動を減らせます。",
    },
  ] satisfies readonly RecommendedPlanStep[],
  checklist: [
    "絶対に外せない予定が重なっていないか",
    "整理券・購入・場所取り・移動の時間が入っているか",
    "食事や休憩を取れる余白があるか",
  ],
  closingNote:
    "予定が詰まりすぎていたら、優先度の低いものを1つ外して、当日に動かせる余白を残しましょう。",
  articleLink: {
    label: "初めての方向け1日プランを見る",
    href: "/articles/harmonyland-first-day-plan",
  },
} as const;
