---
type: specification
status: approved
updated: 2026-10-06
owner: project
---

# 楽天PR掲載枠

楽天APIで検索した商品を、掲載場所ごとに選んで紹介する。初回の公開配置はTOPのガイド下・Instagram前。見出しは「PICK UP」、説明は「気になるアイテムをピックアップ」。スマートフォンは2列×2行の4件、1024px以上は4列×1行とする。

## 管理する操作

管理メニューの「楽天PR管理」（`/admin/rakuten-pr`）を開く。楽天APIの接続情報は既存の「楽天API設定」で管理する。

「商品紹介」で以下の操作を行う。「バナー」では[楽天バナー掲載枠](楽天バナー掲載枠.md)を独立して管理する。

1. 掲載場所を選択する。現在は「TOPのPICK UP」。
2. キーワードで楽天市場の商品を検索する。画像のある販売中の商品を1ページ最大12件取得する。
3. 掲載する4件を選び、並び順と任意の短い紹介文を編集する。
4. 見出し・説明とスマホ表示プレビューを確認する。
5. 「この掲載枠を公開表示する」をオンにして「掲載内容を保存」を押す。

途中の選択や編集も公開表示オフで保存できる。公開には4件の商品とAPI・アフィリエイトIDの登録が必要。公開時に、4商品の取得とアフィリエイトリンクをサーバー側で確認する。表示をオフにしても商品選択は保持する。

## 公開カード

- 正方形の商品画像、商品名、編集者の短い紹介文を表示する。カード内に独立したボタンは置かない。
- 商品名と紹介文はそれぞれ2行まで。カード全体を同じアフィリエイトリンクにし、画像・テキスト・カード内の余白から遷移できる。ホバー・押下・キーボードフォーカスの表示もカード全体に付ける。
- 「広告／PR」と楽天指定のクレジットを掲載する。アフィリエイトリンクは別タブで開き、`nofollow sponsored noopener noreferrer`を付ける。
- 価格・在庫数・レビューは表示しない。
- 未設定または表示オフの枠は、見出しや空のカードも表示しない。
- 取得できない商品・販売終了した商品・アフィリエイトリンクのない商品は公開から除外する。API障害は他のTOPコンテンツの表示を妨げない。
- 画像は楽天APIが返したURLをそのまま使う。現在の市場商品検索APIの画像は128px。生成画像を実商品として流用せず、画像URLを独自に改変しない。

## 保存・データ境界

商品選択の正本はSupabase Storageの非公開 `site-settings` バケット、`rakuten-pr/{placementId}.json`。既存のガイド設定と別オブジェクトにし、掲載場所ごとに独立保存する。初回保存時、必要なら非公開バケットを作成する。DBテーブル・リモートMigration・新規の環境変数は不要。

保存するのは掲載枠ID、表示設定、見出し、説明、商品コードと編集者の紹介文、保存日時。商品画像・商品名・アフィリエイトURLや接続キーをこの設定ファイルに保存しない。API接続キーは引き続き専用非公開 `integration-secrets/rakuten.json` のみ。

商品コードからサーバー側でAPI情報を取得し、1時間キャッシュする。キャッシュキーには商品コードだけを使い、接続キーを引数にしない。API設定を更新したら商品キャッシュと掲載ページを再検証する。商品取得の実リクエストは同一プロセス内で直列化し、開始間隔を1.1秒以上空ける。複数サーバー間の共通レート制御は導入していないため、楽天から429が返った場合は安全なエラーを表示する。

管理APIは全リクエストで管理者認証を確認し、応答は`private, no-store`。更新はJSONのみ、別オリジンを拒否。商品コード・重複・件数・テキスト長を検証し、ブラウザから渡された画像URLやリンクは保存しない。公開になった設定バケットや破損した設定は上書きしない。サービス側の応答やアクセスキーをエラーメッセージへ転記しない。

## 他画面へ掲載枠を増やす

`lib/rakuten-pr.ts`の`RAKUTEN_PR_PLACEMENTS`が掲載枠の登録簿。ID、管理画面上の名前、掲載位置、商品数、再検証するパスを登録する。例えば、記事末尾を別IDで登録すると、管理画面の掲載場所選択肢に追加される。

対象ページのサーバー側で`getPublicRakutenPrPlacement(掲載枠ID)`を読み、共通`RakutenPrSection`へ渡す。見出し・表示オンオフ・商品選択の保存先と管理APIは共通であり、TOP設定を流用して上書きしない。コンポーネントの`className`と`compact`で記事幅にも合わせられる。

現時点で記事などの追加画面は公開ページに組み込んでいない。掲載枠の登録と対象画面への組み込みを、次の配置依頼時に行う。記事単位の選択や上書きも、その際に別のスコープとして設計する。

## 実装入口と検証

- 公開：`components/rakuten-pr-section.tsx`、`app/(site)/page.tsx`
- 管理：`components/admin/rakuten-pr-manager.tsx`、`app/admin/(protected)/rakuten-pr/`
- API：`app/api/admin/rakuten-products/`、`app/api/admin/rakuten-pr/[placementId]/`
- 取得：`lib/rakuten-api.ts`、`lib/rakuten-products.ts`、`lib/rakuten-pr-data.ts`
- 保存：`lib/rakuten-pr-settings.ts`
- 登録・検証：`lib/rakuten-pr.ts`、`lib/rakuten-pr.integration.test.ts`
- 自動チェック：`npm.cmd run test:rakuten`、lint、型チェック、production build
- 視覚・操作確認：`audit/rakuten-pr-2026-10-06/`

参照：[楽天市場商品検索API](https://webservice.rakuten.co.jp/documentation/ichiba-item-search)、[クレジット指定](https://webservice.rakuten.co.jp/guide/credit)、[API利用頻度](https://webservice.faq.rakuten.net/hc/ja/articles/900001974383-%E5%90%84API%E3%81%AE%E5%88%A9%E7%94%A8%E5%88%B6%E9%99%90%E3%82%92%E6%95%99%E3%81%88%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84)。
