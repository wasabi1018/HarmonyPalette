import type { Metadata } from "next";
import { InformationPage } from "@/components/information-page";
import { INSTAGRAM_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "ユーザーデータの削除",
  description: "Harmony PaletteのInstagramコメント連動DMに関する保存データの削除依頼方法をご案内します。",
  alternates: { canonical: "/data-deletion" },
};

export default function DataDeletionPage() {
  return (
    <InformationPage
      eyebrow="DATA DELETION"
      title="ユーザーデータの削除"
      description="Instagramのコメント連動DMで当サイトが保存した情報の削除依頼方法をご案内します。"
      updatedAt="2026年10月12日"
    >
      <p>
        Harmony Paletteは、対象のInstagram投稿へのコメントに応じて画像と案内文を送るため、
        コメント内容やInstagramアカウントの識別子、送信状況などを保存する場合があります。
        これらの当サイト側の保存データについて、削除を依頼できます。
      </p>

      <h2>削除を依頼する方法</h2>
      <ol>
        <li>
          コメントしたInstagramアカウントから、
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            Harmony Paletteの公式Instagramアカウント
          </a>
          にDMを送ってください。
        </li>
        <li>
          DMに「コメント連動DMの保存データを削除したい」と記載し、
          分かる範囲で対象の投稿URL、コメントした時期・内容をお知らせください。
        </li>
        <li>
          運営が依頼元のアカウントと対象データを確認したうえで削除し、
          対応結果をDMでお知らせします。確認に必要な情報を追加で伺う場合があります。
        </li>
      </ol>
      <p>パスワードやログイン用の確認コードを送る必要はありません。</p>

      <h2>対象となる情報</h2>
      <p>
        当サイトがコメント連動DMのために保存した、コメントID・内容、Instagramアカウントの識別子、
        フォロー状況の判定、DMやコメント返信の送信ID・処理状況などが対象です。
      </p>

      <h2>Instagram上のコメント・DMについて</h2>
      <p>
        この依頼で削除するのは当サイト側の保存データです。
        Instagram上に投稿されたコメントや、すでに送受信したDMは、この手続きでは削除されません。
        Instagram上の情報は、Instagramの機能から管理してください。
      </p>
    </InformationPage>
  );
}
