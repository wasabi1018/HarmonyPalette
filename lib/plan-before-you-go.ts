export type PlanGuideContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: readonly string[] }
  | { type: "subheading"; text: string }
  | { type: "example"; lines: readonly string[]; caption?: string };

export type PlanGuideLink = {
  label: string;
  href: string;
};

export type PlanGuideItem = {
  id: string;
  icon: string;
  title: string;
  summary: string;
  content: readonly PlanGuideContentBlock[];
  planAction: string;
  note?: string;
  links?: readonly PlanGuideLink[];
};

export const PLAN_BEFORE_YOU_GO = {
  title: "プランを立てる前に知っておきたいこと",
  introduction:
    "開始時刻だけでなく、整理券の取得、カード購入、場所取り、移動時間まで考えておくと、当日の予定が崩れにくくなります。Harmony Paletteの来園体験と公式案内をもとに、予定を組む前に確認したいポイントをまとめました。",
  footerNote:
    "掲載している情報は、Harmony Paletteの来園体験と公式案内をもとにしています。整理券、販売方法、場所取り、観覧方法などの運営ルールは変更される場合があります。来園当日は、公式案内と現地スタッフの案内を優先してください。",
  items: [
    {
      id: "fan-studio",
      icon: "📸",
      title: "ファンスタジオは「誰に会うか」を先に決める",
      summary: "入園後早めに整理券を確認し、会いたいキャラクターの優先順位を決めておきましょう。",
      content: [
        {
          type: "paragraph",
          text: "現在、ファンスタジオの無料整理券は、園内の「FUN STUDIO Wi-Fi」に接続して取得するデジタル方式です。",
        },
        {
          type: "paragraph",
          text: "無料整理券ではキャラクターを選択でき、1グループにつき同時に1枚まで取得できます。次の整理券は、参加中のグリーティング終了後に取得できます。",
        },
        {
          type: "paragraph",
          text: "希望が集中する日は早く受付が終了することがあるため、事前に次のような優先順位を決めておくと動きやすくなります。",
        },
        {
          type: "list",
          items: [
            "絶対に会いたいキャラクター",
            "時間が合えば会いたいキャラクター",
            "ほかの予定を優先する時間帯",
          ],
        },
        {
          type: "paragraph",
          text: "有料のハーモニーパスでは、キャラクターと時間を選べます。パレードや食事と整理券の時間が重なりそうな場合の選択肢になります。",
        },
      ],
      planAction: "入園後すぐに「ファンスタジオ整理券を確認」",
      note: "整理券の取得方法や受付状況は変更される場合があります。来園日の公式案内を確認してください。",
      links: [
        {
          label: "無料整理券の取り方を見る",
          href: "/articles/harmonyland-fan-studio-greeting-ticket-guide",
        },
        {
          label: "ハーモニーパスの使い方を見る",
          href: "/articles/harmonyland-fan-studio-harmony-pass-guide",
        },
      ],
    },
    {
      id: "parade",
      icon: "🎀",
      title: "パレードは「見る場所」を先に決める",
      summary: "有料席・無料着席・立ち見のどれにするかで、必要な時間が変わります。",
      content: [
        {
          type: "paragraph",
          text: "パレードは開始時刻だけでなく、どの観覧方法を選ぶかによって予定の組み方が変わります。",
        },
        {
          type: "list",
          items: [
            "最前列で確実に見たい：有料観覧席",
            "無料で座って見たい：場所取り・案内待ちの時間を確保",
            "待ち時間を抑えたい：立ち見を候補にする",
          ],
        },
        {
          type: "paragraph",
          text: "パレードの場所取りは、開始1時間前からできます。",
        },
        {
          type: "paragraph",
          text: "場所取り開始前には、案内看板の設置やスタッフによるアナウンスがあります。待機場所や案内方法は、当日現地で確認してください。",
        },
      ],
      planAction: "「パレード開始」ではなく「待機・場所取り開始」から予定を確保する",
      links: [
        {
          label: "パレードの場所取り・観覧席ガイドを見る",
          href: "/articles/harmonyland-parade-seat-guide",
        },
      ],
    },
    {
      id: "show",
      icon: "🎭",
      title: "ショーは場所取り・入場案内を確認する",
      summary: "前方や座席で見たい場合は、開演時刻だけでなく入場案内も確認しましょう。",
      content: [
        {
          type: "paragraph",
          text: "ショーによって、自由席・立ち見・特別エリア・有料席・優先案内など、観覧方法が異なります。",
        },
        {
          type: "paragraph",
          text: "プラザステージでは席数に限りがあり、満席になると案内できない場合があります。また、ショーによっては場所取りを開始できる時刻が決められており、その前から案内開始を待つ列ができることもあります。",
        },
        {
          type: "paragraph",
          text: "前方や座席で見たい場合は、開演時刻だけを予定に入れず、当日の案内に記載された次の時刻から逆算しましょう。",
        },
        {
          type: "list",
          items: ["場所取り開始", "入場開始", "受付開始", "優先エリアへの案内開始"],
        },
        { type: "subheading", text: "場所取りのヒント" },
        {
          type: "list",
          items: [
            "開催場所がどのステージか確認する",
            "座り見・立ち見・参加型などの観覧方法を確認する",
            "前方で見たい場合は、案内開始前の待ち時間も考える",
            "荷物だけで場所取りできないショーがある",
            "ベビーカーやカメラを使用できる場所が指定される場合がある",
            "暑い時期は、日向と日陰で場所の埋まり方が異なる",
            "イベントごとの公式案内と現地スタッフの誘導を優先する",
          ],
        },
      ],
      planAction: "「ショー開始」だけでなく「ショー会場へ移動」または「場所取り開始」を追加する",
      note: "場所取り開始時刻や観覧ルールはショーごとに異なります。固定で「開演○分前」と判断せず、当日の案内を確認してください。",
    },
    {
      id: "bingo",
      icon: "🎯",
      title: "ビンゴはカード販売開始から逆算する",
      summary: "開演時刻だけでなく、当日のカード販売案内を確認しましょう。",
      content: [
        {
          type: "paragraph",
          text: "ビンゴは、参加カードの購入が必要になる場合があります。",
        },
        {
          type: "paragraph",
          text: "公式の日別案内には、次のような情報が掲載されることがあります。",
        },
        {
          type: "list",
          items: ["カード販売開始時刻", "カードの販売場所", "参加料金", "購入可能枚数", "数量限定などの注意事項"],
        },
        {
          type: "paragraph",
          text: "「開演30分前から販売」と案内される日もありますが、販売開始時刻・場所・料金・購入可能枚数は変更される可能性があります。",
        },
        {
          type: "paragraph",
          text: "来園日の公式案内に記載された情報を優先し、ビンゴの開始時刻だけでなく、カードの購入時間も予定に入れましょう。",
        },
        {
          type: "example",
          lines: ["11:00　ビンゴ", "10:30　ビンゴカード購入"],
          caption: "当日の案内に「開演30分前から販売」と記載されている場合の例です。",
        },
      ],
      planAction: "当日の案内に記載された時刻に「ビンゴカード購入」を追加する",
    },
    {
      id: "travel-buffer",
      icon: "🚶",
      title: "次の予定まで、移動と待ち列の余白を取る",
      summary: "終了時刻と次の開始時刻を直結せず、移動・トイレ・混雑の時間を残しましょう。",
      content: [
        {
          type: "paragraph",
          text: "ショーやグリーティングの終了直後に、次の場所へすぐ移動できるとは限りません。",
        },
        {
          type: "paragraph",
          text: "次のような時間も考慮して、予定と予定の間に余裕を持たせましょう。",
        },
        {
          type: "list",
          items: [
            "ショー終了後の退場混雑",
            "エリア間の移動",
            "アトラクションや乗り物の待ち時間",
            "トイレ",
            "ベビーカーでの移動",
            "子どもの歩く速度や休憩",
            "写真撮影や買い物",
          ],
        },
        {
          type: "paragraph",
          text: "Harmony Paletteの来園記録でも、パレード終了後のハーモニートレインで最初の便に乗れなかった例や、トイレや乗り継ぎを含めて想定以上に時間がかかった例があります。",
        },
        {
          type: "paragraph",
          text: "同じエリアで開催される予定を続けて組み合わせると、移動による遅れを減らせます。",
        },
      ],
      planAction: "次の固定予定まで「移動・トイレ・休憩」の空白時間を残す",
      links: [
        {
          label: "初めての1日モデルプランを見る",
          href: "/articles/harmonyland-first-day-plan",
        },
      ],
    },
    {
      id: "meal-break",
      icon: "🍽️",
      title: "食事と休憩は先に1枠確保する",
      summary: "混雑と疲れを考え、食事時間と休憩場所の候補を決めておきましょう。",
      content: [
        {
          type: "paragraph",
          text: "食事を固定イベントの間に無理に入れると、レストランの混雑によって次の予定に遅れることがあります。",
        },
        {
          type: "paragraph",
          text: "混雑が予想される日は、昼食時間を少し早める、または遅めることも候補にしましょう。",
        },
        {
          type: "paragraph",
          text: "子ども連れの場合は、疲れてから休憩場所を探すのではなく、事前に候補を決めておくと安心です。",
        },
        {
          type: "paragraph",
          text: "予定を立てるときは、次の3つを考えておくのがおすすめです。",
        },
        {
          type: "list",
          items: ["食事をする時間", "休憩する場所", "混雑していた場合の代替候補"],
        },
        {
          type: "paragraph",
          text: "園外のフレンドリーホールやピクニックガーデンを利用する場合は、当日の利用条件や再入園方法も確認してください。",
        },
      ],
      planAction: "「食事」「休憩」「混雑時の代替候補」を先に決める",
      links: [
        {
          label: "初めての1日モデルプランを見る",
          href: "/articles/harmonyland-first-day-plan",
        },
        {
          label: "子連れ・暑さ対策ガイドを見る",
          href: "/articles/harmonyland-summer-toddler-heat-measures",
        },
      ],
    },
  ] satisfies readonly PlanGuideItem[],
} as const;
