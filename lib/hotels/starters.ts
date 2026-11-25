import { emptyHotel, type Hotel } from "./model";
// Candidates only. Registration stays draft; nothing is automatically published.
export function starterHotels(): Hotel[] {
  const rows = [
    [
      "grand-mercure-beppu-bay",
      "グランドメルキュール別府湾リゾート＆スパ",
      "hiji",
      "https://grand-mercure-beppubay-resortandspa.jp/",
      "パークへの移動と、ホテルで過ごす時間を両方大切にしたい方へ。",
      "ハーモニーランド旅行とリゾート滞在を組み合わせたい家族に。",
    ],
    [
      "fico-hiji",
      "fico HIJI",
      "hiji",
      "https://www.fico-hiji.com/",
      "日出町を拠点に、パーク中心の旅行を組み立てたい方へ。",
      "朝の移動や宿泊条件を確認して、シンプルに旅を楽しみたい方に。",
    ],
    [
      "suginoi-hotel",
      "杉乃井ホテル",
      "beppu",
      "https://suginoi.orixhotelsandresorts.com/",
      "ハーモニーランドに加え、ホテルで遊ぶ時間も楽しみたい方へ。",
      "パークとホテルを別の日に楽しむ、ゆとりのある旅行に。",
    ],
    [
      "grandvrio-beppuwan-wakura",
      "グランヴィリオホテル別府湾 和蔵",
      "hiji",
      "https://www.grandvrio-hotelresort.com/beppuwan/",
      "子どもとの過ごしやすさと、温泉で休む時間を大切にしたい方へ。",
      "子ども向け設備と、パークへのアクセスを一緒に比較したい家族に。",
    ],
    [
      "hotel-solage-oita-hiji",
      "スパ＆リゾート ホテルソラージュ 大分・日出",
      "hiji",
      "https://solage.jp/",
      "ハーモニーランド旅行に、海辺で過ごす時間を添えたい方へ。",
      "パークと温泉、季節のホテルの楽しみを組み合わせたい家族に。",
    ],
    [
      "kamenoi-hotel-beppu",
      "亀の井ホテル 別府",
      "beppu",
      "https://kamenoi-hotels.com/beppu/",
      "ハーモニーランドと別府観光を組み合わせたい方へ。",
      "パークだけでなく、別府の街歩きも予定に入れたい方に。",
    ],
  ];
  const checkedOn = "2026-11-24";
  // Existing, user-owned link materials from drafts/post-harmonyland-hotels-draft.ts.
  const affiliateBase =
    "https://hb.afl.rakuten.co.jp/hgc/56515322.0f6a6141.56515323.347e7358/";
  const imageBase =
    "https://hbb.afl.rakuten.co.jp/hgb/56515322.0f6a6141.56515323.347e7358/";
  const ut =
    "eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMDB4MTAwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjAsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D";
  const hotelNos = ["8950", "179099", "5547", "183018", "31206", "4807"];
  return rows.map(
    ([slug, name, areaId, officialUrl, summary, highlight], i) => {
      const hotel: Hotel = {
        ...emptyHotel(
          `8a800000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        ),
        slug,
        name,
        areaId,
        officialUrl,
        summary,
        highlight,
        sortOrder: (i + 1) * 10,
        verifiedOn: checkedOn,
        whyStay: highlight,
        familyNotes:
          "添い寝の対象年齢・人数、食事代、寝具の扱いを、子どもの年齢を入力して確認しましょう。貸出品は数に限りがある場合もあるため、必要なものは予約前にホテルへ相談するのがおすすめです。",
        morningNotes:
          "朝食、チェックアウト、車への荷物の積み込みも含めて出発時刻を考えましょう。開園時間は来園日によって変わるため、公式営業案内と当日の道路状況をご確認ください。",
        nightNotes:
          "ナイト営業まで楽しむ日は、到着予定時刻と最終チェックイン、夕食や温泉の利用時間を事前にホテルへ確認しましょう。送迎の有無や運行時間も、夜の帰りに利用できるかを別途確認してください。",
        audience: highlight,
        sources: [{ label: `${name} 公式サイト`, url: officialUrl, checkedOn }],
      };
      const linkId = `8a810000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
      hotel.bookingLinks = [
        {
          id: linkId,
          provider: "rakuten",
          label: "楽天トラベル",
          url: `${affiliateBase}?pc=${encodeURIComponent(`https://travel.rakuten.co.jp/HOTEL/${hotelNos[i]}/${hotelNos[i]}.html`)}&link_type=picttext&ut=${ut}`,
          primary: true,
        },
      ];
      hotel.images = [
        {
          id: `8a820000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
          kind: "rakuten",
          path: "",
          url: `${imageBase}?me_id=2100001&item_id=${hotelNos[i]}&pc=${encodeURIComponent(`https://img.travel.rakuten.co.jp/image/imgr_100?no=${hotelNos[i]}`)}`,
          alt: `${name}の楽天トラベル宿泊施設画像`,
          credit: "楽天トラベル",
          license:
            "既存のホテル記事下書きに登録された楽天アフィリエイトの発行済みリンク素材。該当施設の楽天予約ページへの誘導専用。公開前に素材・リンクを最終確認。",
          expiresOn: null,
          bookingLinkId: linkId,
        },
      ];
      const routes: Record<number, [number, number | null, string, string]> = {
        0: [
          13,
          null,
          "https://grand-mercure-beppubay-resortandspa.jp/plan/oita-sightseeing-base-all-inclusive-stay/",
          "ホテル公式の観光案内に記載された車での目安。経路・道路状況によって変わります。",
        ],
        1: [
          5,
          10,
          "https://www.fico-hiji.com/faq/",
          "公式FAQは車で5分、公式観光記事は約10分と案内しています。経路条件は要確認のため、朝は余裕を持って出発してください。",
        ],
        3: [
          15,
          null,
          "https://www.grandvrio-hotelresort.com/beppuwan/sightseeing/",
          "ホテル公式の観光案内に記載された車での目安。経路・道路状況によって変わります。",
        ],
        5: [
          38,
          null,
          "https://kamenoi-hotels.com/beppu/sightseeing/",
          "ホテル公式の観光案内に記載された車での目安。経路・道路状況によって変わります。",
        ],
      };
      const route = routes[i];
      if (route) {
        [
          hotel.driveMinutes,
          hotel.driveMinutesMax,
          hotel.driveSourceUrl,
          hotel.driveNote,
        ] = route;
        hotel.driveCheckedOn = checkedOn;
        hotel.sources.push({
          label: "ハーモニーランドへのアクセス案内",
          url: route[2],
          checkedOn,
        });
      } else
        hotel.driveNote =
          "ホテルからハーモニーランドまでの車での所要時間は未確認です。公式情報などで経路を確認してから掲載します。";
      if (i === 0) {
        hotel.tagIds = ["family", "resort", "bath", "free-parking"];
        hotel.facts.parking =
          "公式案内に無料駐車場の記載あり。利用条件は最新案内をご確認ください。";
        hotel.facts.bath =
          "温泉・大浴場の案内あり。利用時間・条件は公式サイトをご確認ください。";
        hotel.facts.meals =
          "オールインクルーシブの食事・ラウンジの案内あり。対象プランと提供時間をご確認ください。";
        hotel.recommended = true;
        hotel.whyStay =
          "公式サイトでハーモニーランドのオフィシャルホテルと案内されています。パークと温泉・食事を組み合わせ、移動だけでなくホテル滞在も旅の楽しみにしたい家族の候補です。";
        hotel.familyNotes =
          "オールインクルーシブでも、子どもの食事・寝具や客室の定員は宿泊プランで確認しましょう。ホテルで食事を楽しむ時間も取れるよう、パークでの過ごし方と合わせて選ぶのがおすすめです。";
        hotel.morningNotes =
          "公式案内の車で約13分を基準に、朝食と入園準備の時間も見込みましょう。事前予約制のシャトルバスを検討する場合は、来園日の開園時刻と利用便の時刻が合うかをご確認ください。";
        hotel.nightNotes =
          "パークへの送迎があっても、ナイト営業の終了時刻に利用できるとは限りません。帰りの便・夕食の受付・最終チェックインを確認し、遅い帰着になる日はホテルへ相談しましょう。";
      }
      if (i === 1) {
        hotel.tagIds = ["free-parking"];
        hotel.address = "大分県速見郡日出町川崎2-4";
        hotel.whyStay =
          "日出町を拠点に、パーク中心の予定を組みたい方の候補です。公式の所要時間には5分と約10分の表記があるため、近さを重視しながらも朝の準備には余裕を持たせましょう。";
        hotel.familyNotes =
          "公式サイトにはシングル・ダブル・ツインなどの客室案内があります。子どもと泊まる場合は、ベッド幅・客室定員・添い寝の条件を確認し、必要な貸出品をホテルへ相談してください。";
        hotel.morningNotes =
          "公式案内ではパークに近い立地ですが、朝食・チェックアウト・荷物の積み込みは別に時間が必要です。第二駐車場を利用する場合の移動も見込んで出発すると安心です。";
        hotel.nightNotes =
          "パークで夕方以降まで過ごす日は、遅い到着への対応や夕食の予定を先に確認しましょう。周辺の飲食店やコンビニの営業時間は未確認のため、夜間も利用できるとは案内していません。";
        hotel.facts.parking =
          "30台無料、先着順。公式アクセス案内に第二駐車場の記載があります。";
        hotel.sources.push(
          {
            label: "アクセス・施設概要",
            url: "https://www.fico-hiji.com/sp/access/index.html",
            checkedOn,
          },
          {
            label: "公式観光記事の所要時間",
            url: "https://www.fico-hiji.com/tourism/223/",
            checkedOn,
          },
        );
      }
      if (i === 2) {
        hotel.tagIds = ["family", "resort", "bath"];
        hotel.address = "大分県別府市観海寺1";
        hotel.facts.bath =
          "展望露天風呂などの案内あり。宿泊棟による利用条件をご確認ください。";
        hotel.whyStay =
          "温泉や館内の遊びも旅の楽しみにしたい家族の候補です。パークの日とホテルで過ごす日を分けると、移動と滞在に余裕を持たせやすくなります。";
        hotel.familyNotes =
          "公式サイトに複数の宿泊棟や館内施設の案内があります。予約する部屋から食事会場・温泉までの位置を確認し、小さな子どもや荷物を連れて移動しやすいかも比較しましょう。";
        hotel.morningNotes =
          "ハーモニーランドまでの車での所要時間は未確認です。朝食もホテルで楽しむ場合は、経路を確認したうえで、チェックアウトと入園準備まで含めて出発時刻を決めてください。";
        hotel.nightNotes =
          "パークのナイト営業とホテルの食事・館内施設を同じ日に楽しむ場合は、受付・利用時間の重なりに注意しましょう。翌日をホテルで過ごす日とするなど、滞在時間を確保する選び方もあります。";
      }
      if (i === 3) {
        hotel.tagIds = ["family", "bath", "free-parking"];
        hotel.address = "大分県速見郡日出町大字平道1780-1";
        hotel.facts.bath = "天然温泉の大浴場の案内あり。";
        hotel.facts.parking =
          "公式宿泊プランに駐車場無料の案内あり。最新の利用条件をご確認ください。";
        hotel.whyStay =
          "公式サイトでキッズコーナーを案内しているホテルです。パークで遊んだあとも、ホテルで子どもと過ごす時間を楽しみたい家族の候補になります。";
        hotel.recommended = true;
        hotel.familyNotes =
          "公式サイトではボールプール・積み木・お絵かきなどのキッズコーナーを案内しています。対象年齢や利用時間、添い寝・食事の条件は、宿泊プランと最新のホテル案内でご確認ください。";
        hotel.morningNotes =
          "ホテル公式の車で約15分を目安に、朝食の受付や荷物を積み込む時間も見込みましょう。開園直後から遊びたい日は、朝食付きプランの利用時間と出発予定を合わせて確認してください。";
        hotel.nightNotes =
          "朝食付き・夕朝食付きなど、食事の付け方もパークの予定に合わせて比較しましょう。ナイト営業後に戻る場合は、ホテルの夕食受付や温泉の利用時間に間に合うかを先に確認してください。";
      }
      if (i === 4) {
        hotel.tagIds = ["resort", "bath"];
        hotel.facts.bath = "公式サイトに温泉の案内あり。";
        hotel.whyStay =
          "海の眺めや温泉も旅行の楽しみに入れたい方の候補です。プールなど季節によって営業する施設は、宿泊日に利用できるかを確認してから予定を組みましょう。";
        hotel.familyNotes =
          "プールも旅の目的に含める場合は、宿泊日の営業・子どもの利用条件を先に確認しましょう。和室・添い寝・貸出品の条件は未確認のため、希望する客室を予約する前にホテルへご相談ください。";
        hotel.morningNotes =
          "ホテルからパークまでの車での所要時間は未確認です。海辺で過ごす時間とパークの開園時間を両立できるよう、経路・朝食・チェックアウトを確認して予定を組みましょう。";
        hotel.nightNotes =
          "パークから戻ったあとに温泉や食事も楽しみたい場合は、それぞれの受付・利用時間をご確認ください。ナイト営業を最後まで楽しむ日は、到着予定時刻をホテルへ伝えておくと安心です。";
      }
      if (i === 5) {
        hotel.tagIds = ["family", "bath"];
        hotel.address = "大分県別府市中央町5-17";
        hotel.facts.checkIn = "15:00（宿泊プランにより異なる場合があります）";
        hotel.facts.checkOut = "11:00（宿泊プランにより異なる場合があります）";
        hotel.facts.bath = "公式サイトに温泉の案内あり。";
        hotel.whyStay =
          "パークの前後に別府観光を組み込みたい方の候補です。ベビールームなど客室タイプを比較し、子どもの年齢や人数に合う部屋を選びましょう。";
        hotel.familyNotes =
          "公式サイトにベビールームの案内があります。赤ちゃん連れではその客室の設備・定員を確認し、通常の客室と比較してください。添い寝の人数・年齢や食事代はプランでの確認が必要です。";
        hotel.morningNotes =
          "ホテル公式の車で約38分を目安に、朝食・チェックアウト・入園準備を含めて出発時刻を決めましょう。別府観光も同日に組み込む場合は、パークで過ごす時間を先に確保すると計画しやすくなります。";
        hotel.nightNotes =
          "別府での夕食も予定に入れたい場合は、パークから戻る時刻と店舗の営業時間を確認してください。ホテルのチェックイン時刻は公式案内に15時とありますが、遅い到着の受付条件は別途確認が必要です。";
      }
      return hotel;
    },
  );
}
