# 周辺ホテルガイド 実装・検証報告

2026-11-24。ローカル実装。本番DBへのMigration適用、ホテル登録・公開、Storageアップロード、デプロイは実施していない。既存の作業中変更を保持し、この機能の変更を追加した。

## 実装した機能

- 記事から独立した `/hotels` と `/hotels/[slug]`。6施設分の初期登録データを準備。
- 所要時間・特徴・エリア・独自おすすめを含むコンパクトなカード、特徴AND・エリアORの絞り込み、おすすめ順・近い順。スマホの条件は一部折りたたみ。
- 詳細の複数写真、設備・添い寝などの条件、出典・最終確認日、独自解説、上下の予約ボタン。
- 複数サービスの予約リンクとsponsored属性。未登録サービス非表示。初期リンク・画像素材は既存のホテル記事下書きのものを引き継ぎ、料金・空室・星評価は登録しない。
- `/admin/hotels` の登録・編集・状態切り替え・ゴミ箱/下書き復元・写真・エリア/タグ・掲載順・おすすめ・PR期間・SEO・確認日。
- 有料PRを別枠表示し、開始・終了とタブ復帰を再評価。終了後の優先掲載を解除し、詳細の提供関係の説明を保持。
- TOP・混雑予想・マイプラン・任意の記事・ナビからの案内。
- 既存解析APIへのバッチ送信と、管理画面の30日集計・ホテル別/サービス別/流入元別・CSV。予約成立や確定報酬は推測しない。
- metadata、canonical、OGP、パンくず、ItemList/Hotel構造化データ、索引条件、sitemap。

## ファイル

新規追加の主要ファイル：

- `app/(site)/hotels/page.tsx`
- `app/(site)/hotels/[slug]/page.tsx`
- `app/admin/(protected)/hotels/page.tsx`
- `app/api/admin/hotels/route.ts`
- `app/api/admin/hotels/images/route.ts`
- `app/api/hotels/[id]/images/[imageId]/route.ts`
- `components/hotels/hotel-catalog.tsx`
- `components/hotels/hotel-guide-cta.tsx`
- `components/hotels/telemetry.tsx`
- `components/hotels/hotels.module.css`
- `components/admin/hotel-manager.tsx`
- `components/admin/hotel-manager.module.css`
- `lib/hotels/model.ts`
- `lib/hotels/model.test.ts`
- `lib/hotels/repository.ts`
- `lib/hotels/events.ts`
- `lib/hotels/starters.ts`
- `supabase/migrations/20261124044704_hotel_guide.sql`
- `scripts/hotel-test-database.ts`
- `scripts/test-hotel-migration.ts`
- `scripts/hotel-qa-server.ts`
- `scripts/qa-hotels-browser.mjs`
- `knowledge/specs/周辺ホテルガイド.md`

既存ファイルの変更：

- `app/(site)/layout.tsx`：解析の共通リスナー。
- `components/home-sections.tsx`、`app/(site)/crowd-forecast/page.tsx`、`app/(site)/plan/page.tsx`：ホテル案内。
- `app/(site)/articles/[slug]/page.tsx`、`components/admin/article-travel-fields.tsx`：記事ごとの案内設定・表示。
- `lib/travel/spots.ts`、`lib/travel/spots-repository.ts`、`lib/articles/repository.ts`：記事設定の型・読み取り・保存の互換性。
- `lib/travel/admin-request.ts`：プロキシ配下の公開Origin確認。実ブラウザの正しい管理保存が403になる問題を修正。
- `lib/public-cache.ts`：既存施設台帳の変更からもホテル公開キャッシュを失効。
- `lib/navigation.ts`、`components/header.tsx`、`components/mobile-nav.tsx`、`components/admin/admin-shell.tsx`：ナビ。
- `app/api/analytics/event/route.ts`：既存イベントを保持しホテルバッチを追加。
- `app/sitemap.ts`：公開・索引対象のホテルを追加。
- `package.json`：`test:hotels`。依存パッケージの追加なし。
- `lib/travel/api.integration.test.ts`：プロキシ経由のOriginの回帰テスト。
- `lib/crowd-forecast/model.test.ts`：既存テストの配列型推論エラーを型注釈で修正。実行内容は変更しない。
- `SUPABASE_SETUP.md`、`knowledge/specs/仕様索引.md`、`design-qa.md`：運用手順・仕様・検証記録。

## DB

前提Migrationは `20261015141316_travel_plans_spots.sql`。新規Migrationは `20261124044704_hotel_guide.sql`。既存の適用済みMigrationは変更していない。

新規テーブルは `hotels`、`hotel_areas`、`hotel_tags`、`hotel_images`、`hotel_booking_links`、`hotel_tag_relations`、`hotel_daily_events` の7つ。ホテル固有データは共通施設IDに1対1で結び付ける。PRフラグ・期間・優先順位はhotelsに保持する。

公開ホテル・未削除の親に属する子情報だけを一般閲覧可能にし、更新と集計は管理Routeからservice-role限定のsecurity-invoker RPCを呼ぶ。保存は関連情報まで1トランザクション。更新日時で競合を拒否。hotel-imagesは非公開で、管理者プレビューと公開写真の配信を区別する。

記事には `article_travel_metadata.show_hotel_guide` を追加し、既存の記事保存RPCをラップして本文・関連情報・案内設定・改訂の原子性を維持する。

## 管理操作

1. 承認後に必要なMigrationを確認して適用し、アプリを反映する。
2. 管理メニュー「周辺ホテル管理」→「初期6施設を下書き登録」。登録済みID・slugは上書きしない。
3. 各ホテルの「編集」で基本・所要時間・解説・設備・出典・写真・予約リンクを確認する。
4. 所要時間には確認元URLと確認日を入力する。未確認は空欄のままとする。
5. 予約リンクは実際のアフィリエイトURLを入力し、一覧の主ボタンを選ぶ。リンク順も変更できる。
6. 写真にはalt・提供元・利用許諾を入力。楽天素材は対応する楽天リンクを選択。通常のアップロードはWebPの大小2サイズに変換される。
7. 「公開・SEO・PR」で公開状態・順位・おすすめを設定する。検索対象は独自情報を確認してから有効にする。PRは日本時間の開始・終了と広告説明が必要。
8. 記事編集の「旅行プラン・ホテル記事連携」で、記事末尾のホテル案内をオン/オフできる。
9. 「アクセス・クリック」で30日集計とCSVを確認する。新機能の過去未計測アクセスを補完しない。

## 確認済み情報と残る確認

| ホテル | 初期の車所要時間 | 取得元 |
| --- | --- | --- |
| グランドメルキュール別府湾 | 約13分 | [公式滞在プラン案内](https://grand-mercure-beppubay-resortandspa.jp/plan/oita-sightseeing-base-all-inclusive-stay/) |
| fico HIJI | 約5〜10分 | [公式FAQ](https://www.fico-hiji.com/faq/)は5分、[公式観光記事](https://www.fico-hiji.com/tourism/223/)は約10分と案内。相違を補足 |
| 杉乃井ホテル | 未確認 | 推測値は入力しない |
| グランヴィリオホテル別府湾 和蔵 | 約15分 | [公式観光案内](https://www.grandvrio-hotelresort.com/beppuwan/sightseeing/) |
| ホテルソラージュ 大分・日出 | 未確認 | 推測値は入力しない |
| 亀の井ホテル 別府 | 約38分 | [公式観光案内](https://kamenoi-hotels.com/beppu/sightseeing/) |

初期データの確認日は2026-11-24。寝具・貸出品・添い寝・周辺店舗など未確認項目は「未確認」。公開前に素材・アフィリエイトURL・事実・宿泊条件を最終確認する。画像は既存の発行済み楽天リンク素材で、一般のホテル写真としてSNSやOGPに転用しない。写真差し替え時は[楽天公式の利用条件](https://travel.rakuten.co.jp/distributor/affiliate.html)または提供元の許諾に従う。

## SEO・負荷

絞り込みはフラグメントとブラウザ処理。公開データは24時間キャッシュし、管理更新時にタグ・ページ・sitemapを失効する。ホテルごとのN+1は発生させずまとめて取得する。PRのためのCronや毎回SSRは追加しない。

アップロード時に1440px以内・480px以内のWebPを作り、画像データはサーバーキャッシュでStorageへの反復アクセスを減らす。公開・期限を判定する配信Functionと画像転送は発生する。初期の楽天画像は楽天側から配信する。

解析は最大40件のバッチ・日次集計。新規有料APIやnpm依存はない。追加料金を0円と保証するものではなく、本番の画像転送・Function・DB書き込み量で評価する。

## 検証

- `npm run test:hotels`：モデル4テスト成功。隔離PostgreSQLでMigration・一括保存・巻き戻し・競合・URL固定・anon/authenticated権限・非公開子情報・画像期限・集計検証・削除復元・記事改訂・非公開バケットを確認。
- `npm run test:travel`：24テスト成功（既存23＋Origin回帰1）。
- `npm run test:site-analytics`：18テスト成功。
- `npm run test:guides`：18テスト成功。
- `npm run test:crowd-forecast`：成功。
- `tsc --noEmit --incremental false`：成功。
- `npm run lint`：成功。
- production build：成功。`/hotels` はStatic、6施設の詳細はSSG、いずれも24時間キャッシュ。First Load JSは一覧・詳細とも約115kB（共通約102kBを含む）。検証成果物は `.tmp/hotels-next-build` に隔離し、デプロイしない。

ブラウザは実際のNextアプリ→管理API→隔離PostgreSQL→画面の往復を検証。1280px、390px、320pxで25項目成功、JavaScript例外0。実際の登録・保存・削除・下書き復元、画像アップロード、一般向け404/管理者preview200、PRの別枠と期限到達時の自動解除、既存解析APIの204、3ページからのSPA遷移と流入元を確認。予約サイトへの実クリック・予約手続きは実行していない。

一覧・詳細・管理の追加console確認もerror/warningとも0（`console-results.json`）。検証用サーバーは終了し、Nextが追加した検証用パスは設定から除去した。

スクリーンショットは本番とは分離したローカル検証用DBで6施設を公開状態にしたもの。実サイトの公開状態を示すものではない。PR画像・集計値もローカル動作確認で、実契約・実績ではない。

## スクリーンショット

- [PC一覧](01-hotels-desktop.png)
- [スマホ一覧全体](02-hotels-mobile.png)
- [スマホのホテルカード](09-hotels-mobile-cards.png)
- [PC詳細](03-hotel-detail-desktop.png)
- [スマホ詳細](04-hotel-detail-mobile.png)
- [管理一覧](05-admin-list-desktop.png)
- [管理編集](06-admin-editor-desktop.png)
- [スマホ絞り込み](07-hotels-filtered-mobile.png)
- [320px管理画面](08-admin-mobile.png)
- [PR枠の動作確認](10-hotels-pr-desktop.png)
- [管理解析](11-admin-analytics-desktop.png)
- [ブラウザ検証結果](browser-results.json)

## 本番反映前・拡張

DBバックアップとMigrationの適用範囲確認、初期6施設の下書き登録、残る情報と画像権利・リンクの確認、公開・検索対象の判断、承認後のデプロイと公開Auth/Storage/RLSの最終確認が必要。既存の未適用Migrationを一括適用しない。ホスト環境・実管理者アカウントでの書き込みや公開後の実負荷は未確認。

今後は施設IDを利用した旅行プラン追加、許諾写真の充実、ホテル追加、PR契約履歴や事業者の確定成果CSVの取り込みを拡張できる。
