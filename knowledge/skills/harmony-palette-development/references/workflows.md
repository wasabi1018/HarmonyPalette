# 変更ワークフロー

## 公式スケジュール・営業情報の取り込み

1. 取得元形式を特定し、URLと対象日の出典を保持する。
2. `lib/official-import/`の解析と`lib/supabase/schedule-repository.ts`の永続化を確認する。
3. 境界事例にはfixtureまたは対象を絞ったparser・normalizerテストを追加する。
4. 狭い日付範囲で`--persist`なしのプレビューを実行する。
5. 重複、名称正規化、時刻、欠損、下書き・公開状態を確認する。
6. プレビュー結果を提示し、ユーザーが明示的に依頼した場合だけ永続化する。

不確かな時刻、キャラクター、中止情報を事実として推測してはならない。レビュー対象として示す。

## Supabase変更

1. Migration、行mapping、Repository、Route Handler、UI利用箇所まで追跡する。
2. 新しいタイムスタンプ付きSQL Migrationと互換性のあるアプリ挙動を追加する。
3. RLS、管理者認証、公開読み取り、Storage Policy、サーバー限定秘密値を維持する。
4. 既存データ、NULL移行期間、index、復旧、定期処理を検討する。
5. 明示的な依頼なしでリモートProjectへ適用しない。

## 公開・管理UI

1. 可能な場合、変更前のPC・スマートフォン表示を確認する。
2. `app/globals.css`、Tailwind Token、共有Shell、Card、Heading、Status Pill、Lucide Iconを再利用する。
3. keyboard、focus、label、画像alt、固定mobile navigationの余白を維持する。
4. 影響するloading、empty、error、populated、pressed、selected、狭いviewportを確認する。
5. 目標がある場合は同じviewportで比較し、実装結果から作った証跡だけを保存する。

成功を主張するためだけに`design-qa.md`を更新してはならない。残る差異と未確認状態を正直に記録する。

## 記事・ガイド・メディア

1. 下書き、予約、公開、改訂、複製、ゴミ箱、復元、完全削除の状態を維持する。
2. Rich Textを無害化し、Link、Heading順、Cover Image、Tag、SEO、画像altを検証する。
3. 公式事実・リンクと編集上の推奨を区別する。
4. 原本または利用許可のあるMediaを使用する。保護されたキャラクター画像を画像生成で再現してはならない。
5. 共有データを変更した場合は、記事一覧・詳細、Feed、Series、検索・絞り込み、関連記事を確認する。

## Instagram・生成画像

1. 既存の決定的render scriptと出力寸法を再利用する。
2. 編集可能なSourceと最終Exportを分ける。
3. 日本語、安全余白、Crop、鮮明さ、Slide順、Contact Sheetを確認する。
4. 公式Embedはcanonical Instagram permalinkを使用し、provider依存のPC・スマートフォン挙動を確認する。
5. 生成画像だけを公式事実の証拠にせず、取得元で内容を確認する。

## SEO・リリース確認

発見性に影響する変更では、metadata、canonical、structured data、`app/sitemap.ts`、`app/robots.ts`、記事feedを必要に応じて確認する。重複URLと管理・非公開ページのindexを避ける。

| 変更 | 最低限の検証 |
| --- | --- |
| 純粋なutility・domain logic | 対象テスト、lint |
| React・page・API | 対象確認、lint、production build |
| import・parser | parserテスト、preview import、lint、build |
| Migration・Repository | SQL・mapping、影響Route、lint、build |
| 視覚UI | PC・スマホ、操作状態、console、lint、build |
| 記事・生成物 | 内容・出典、寸法、contact sheet |

資格情報、Network、外部Serviceがなく実行できない確認は、ローカルで確認した範囲と残作業を明示する。
