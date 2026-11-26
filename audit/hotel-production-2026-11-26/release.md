# ホテル機能の本番DB適用・初期公開 — 2026-11-26

ユーザーの「DBへのマイグレーションの適用とホテル情報の公開を行ってください」という明示的な指示に基づき実施。

## データベース

対象はHarmony Paletteの本番Supabase。事前調査ではホテル・施設の関連テーブル、同名RPC、該当Storageバケットが未作成であることを確認した。既存記事は29件、公開状態26件、攻略ガイド6件。新規の施設・ホテル用スキーマ以外は適用していない。

- `20261126132102_travel_plans_spots.sql` 適用成功。
- `20261126132743_hotel_guide.sql` 適用成功。

Supabase MCPが実際に割り当てた履歴番号へローカルファイル名を同期した。旧名はそれぞれ `20261015141316_travel_plans_spots.sql`、`20261124044704_hotel_guide.sql`。SQL本文は変更していない。既存記事の本文・公開状態・攻略ガイド設定は更新していない。

11テーブルすべてRLS有効。公開対象はanonのSELECTのみで、anon/authenticatedのINSERT・UPDATE・DELETE権限はなし。非公開施設メモ・日次集計は一般ユーザーが読めない。6つの更新RPCはSECURITY INVOKER・空search_path・service_role専用。Storageの2バケットは非公開。

Security AdvisorのWARNは適用前と同じ5件。新規2件のINFO（RLS有効・ポリシーなし）は、非公開メモと日次集計をservice_roleだけに限定する意図した設定で、公開権限を追加していない。

既存WARNの参照先：[関数のsearch_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)、[public内の拡張](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)、[anonからの既存集計関数実行](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)、[authenticatedからの既存集計関数実行](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)、[漏えいパスワード保護](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。今回の範囲外の既存設定は変更していない。

## 公開したホテル

| ホテル | ハーモニーランドまで車 | 根拠 |
| --- | --- | --- |
| fico HIJI | 約5〜10分 | [公式FAQ](https://www.fico-hiji.com/faq/)は5分、[公式観光記事](https://www.fico-hiji.com/tourism/223/)は約10分。[公式アクセス](https://www.fico-hiji.com/sp/access/index.html)は約8分。公式内の差を範囲で案内。 |
| グランドメルキュール別府湾リゾート＆スパ | 約13分 | [公式観光・滞在案内](https://grand-mercure-beppubay-resortandspa.jp/plan/oita-sightseeing-base-all-inclusive-stay/) |
| グランヴィリオホテル別府湾 和蔵 | 約15分 | [公式観光案内](https://www.grandvrio-hotelresort.com/beppuwan/sightseeing/) |
| 亀の井ホテル 別府 | 約38分 | [公式観光案内](https://kamenoi-hotels.com/beppu/sightseeing/) |
| 杉乃井ホテル | 未確認 | [公式周辺情報](https://suginoi.orixhotelsandresorts.com/area/)で分数を確認できず、推測しない。 |
| ホテルソラージュ 大分・日出 | 未確認 | [公式周辺観光](https://solage.jp/sightseeing/)で分数を確認できず、推測しない。 |

公式情報を再確認し、最終確認日は2026-11-26。ficoのFAQは通常の本文抽出で交通・駐車場部分が省かれていたため、公式HTML本文でも確認した。駐車場の内部情報は「1部屋1台まで無料、満車時は第2駐車場」へ明確化した。未確認の添い寝・和室などのタグは追加していない。

公開はアプリの `parseHotel` で検証した6施設のみを `save_hotel` RPCで1トランザクション保存。既存ホテルがあれば処理を止める条件を設け、既存レコードの上書きを行っていない。予約リンク・画像は各1件、ユーザー既存の楽天発行済み素材URLを変更せず引き継いだ。楽天の施設番号8950・179099・5547・183018・31206・4807と各施設名の一致を確認。画像と同施設の予約リンクの関連も検証した。

PR・紹介記事は未設定。記事の作成や公開は行っていない。料金・空室・成果件数は登録していない。予約・アフィリエイトリンクをクリックしていない。

## キャッシュ・表示確認

DB適用前に生成された空データが24時間キャッシュされていた。Vercelのタグ失効APIはCDN Cache Namespace未作成で利用できなかったため、新規DBの初回公開に限りホテルデータのキャッシュキーを `hotel-catalog-v3-provisioned` へ更新した。以降は従来どおり24時間TTLと管理画面保存時のタグ・パス失効を使う。

ローカルのモデル5件と隔離DBのマイグレーション・RLS・更新競合等は成功。Lint（ローカルChrome生成物の `.tmp/**` を除外）と、型検査込み本番ビルドも成功。ホテル一覧は静的生成・再検証1日、共通分込み初回JS116kB。

初回キャッシュ切り替えのコミットは `ad3ea6f0a7a9a7a9e41a1afab013b691809921d3`。Vercelの本番デプロイ `dpl_8DzEkeEBQgzs8C5X1RpBcSFLdBtN` がREADYとなった後、[本番ホテルページ](https://harmonypalette.jp/hotels)で6施設を確認した。

本番ブラウザー14項目成功。390・320・1280pxの横幅、全6画像の読み込み、6件のsponsored予約リンク、4件の所要時間・2件の未確認表示、最終確認日、記事未設定時のボタン非表示、子連れ絞り込み・解除、canonical/index、サイトマップ、旧URLの307/noindex、匿名管理APIの401を確認。JavaScript例外・console warning/errorは0件。撮影時は解析送信をブロックし、予約リンクはクリックしていない。

HTTPで連続2回 `x-vercel-cache: HIT` と6施設入りの初期HTMLを確認した。ブラウザー向け `Cache-Control: public, max-age=0, must-revalidate` は毎回DBを読む意味ではなく、共有キャッシュ側では1日再検証の設定を維持している。

目視でモバイル一覧・320px一覧・PC一覧を確認し、今回の表示にP0/P1/P2の未解決事項なし。既存の楽天素材の低解像度は従来からのP3。証跡は `browser-results.json`、`database-results.json` と `01-production-mobile.png`、`03-production-mobile-320.png`、`04-production-desktop.png`。全ページ画像も同ディレクトリに保存している。

最終DB集計はホテル6件すべて公開、予約リンク6件、画像6件、PR0件、紹介記事の紐づけ0件。既存記事29件・公開状態26件・攻略ガイド6件を維持した。紹介記事を作成したら、ホテル管理で対象記事を選択して保存する。公開済み・公開日時到達済み・未削除の記事にだけ「記事を見る」が表示される。

公開を停止する場合はホテル管理で下書き・非公開へ変更し、通常のキャッシュ失効を使う。既存記事を含むスキーマのDROPや破壊的な巻き戻しは行わない。

final result: passed
