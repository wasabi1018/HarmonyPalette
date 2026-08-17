import type { Metadata } from "next";
import Link from "next/link";
import { InformationPage } from "@/components/information-page";
import { OfficialNotice } from "@/components/official-notice";

export const metadata: Metadata = {
  title: "Harmony Paletteについて",
  description: "Harmony Paletteの運営目的、編集方針、情報源についてご案内します。",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <InformationPage
      eyebrow="ABOUT"
      title="Harmony Paletteについて"
      description="ハーモニーランドで過ごす一日を、もっと分かりやすく、もっと楽しみやすく。"
      updatedAt="2026年7月30日"
    >
      <p>
        Harmony Paletteは、ハーモニーランドへのおでかけを楽しむ方に向けて、
        当日の予定、キャラクター、来園準備や周辺旅行のヒントを整理して届ける非公式ファンサイトです。
      </p>

      <h2>運営者</h2>
      <p>
        Harmony Palette 運営
        1歳の娘の影響でハーモニーランド好きになった家族が、実際にハーモニーランドに行って得た情報を整理して公開しています。
        初めての方でも最大限ハーモニーランドを楽しめて、また行きたいと思ってもらえることが目標です♪
        推しは、ピアノちゃん❤
        月に複数回ハーモニーランドに行ってます☺
      </p>

      <h2>サイトの目的</h2>
      <p>
        来園前に必要な情報を探す時間を減らし、現地での体験をゆっくり楽しめるようにすることを目的としています。
        公式情報を確認しやすい形に整理するとともに、独自の記事や体験に基づく情報をお届けします。
      </p>

      <h2>編集方針</h2>
      <ul>
        <li>公式サイト等の信頼できる情報源を確認します。</li>
        <li>事実と、運営者による体験・意見を区別して記載します。</li>
        <li>情報の確認日や更新日が分かる記事づくりを心がけます。</li>
        <li>誤りを確認した場合は、可能な限り速やかに訂正します。</li>
        <li>画像、文章、商標その他の権利を尊重します。</li>
      </ul>

      <h2>情報源について</h2>
      <p>
        スケジュール等の情報は、ハーモニーランド公式サイトで公開されている情報を参照し、
        当サイトが独自に整理・編集しています。天候、運営状況その他の事情により、
        掲載後に内容が変更される場合があります。来園前には必ず公式サイトの最新情報をご確認ください。
      </p>

      <OfficialNotice />

      <h2>お問い合わせ</h2>
      <p>
        掲載内容の訂正依頼やサイトに関するご連絡は、
        <Link href="/contact">お問い合わせページ</Link>
        からお送りください。
      </p>
    </InformationPage>
  );
}
