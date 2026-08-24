# アーキテクチャとコマンド

## 正本と所有場所

- `app/`：Next.js App Routerのページ、Route Handler、metadata、sitemap、robots、feed。
- `components/`：公開UIとスケジュール・My Planの操作画面。
- `components/admin/`：記事、メディア、予定、シリーズ、タグ、分析、Instagram設定の管理UI。
- `lib/supabase/`：ブラウザ・サーバーClient、認証、Repository境界。
- `lib/official-import/`：公式スケジュール・PDFの取得、解析、正規化、取り込みモデル。
- `lib/articles/`：記事検証、公開、品質確認、改訂、メディア、分析、バックアップ。
- `supabase/migrations/`：追記専用のDB変更履歴。
- `scripts/`：インポート、Seed、取得元検査、決定的な画像・QA生成。
- `public/article-guides/`と`output/`：記事・SNSの生成物。不要物と決めつけてはならない。
- `audit/`と`design-qa.md`：視覚証跡とQA判断。
- `knowledge/`：日本語の仕様、技術、設計判断、運用ルール。

## 重要な境界

- 公開UIは`app/(site)`、保護された管理画面は`app/admin/(protected)`に置く。
- 権限付き変更は、認証済み管理Route Handlerまたはサーバー専用Repositoryに置く。
- `lib/daily-plan-store.ts`がMy Planのクライアント状態を管理する。公式予定とユーザー作成予定では編集制約が異なる。
- 公式取り込みは候補・レビューの段階を維持する。`AUTO_PUBLISH_IMPORTS=false`を運用上の推奨値とする。
- 記事画像はSupabase Storage、メディアメタデータと参照はDatabaseに保存する。

## コマンド

Windowsでリポジトリルートから実行する。

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:birthday
.\node_modules\.bin\tsx.cmd --test lib\official-import\funstudio.test.ts
npm.cmd run import:official -- --from YYYY-MM-DD --to YYYY-MM-DD --fanstudio
```

最後のコマンドは`--persist`を付けない限りプレビューである。明示的な許可なしで`--persist`、Seed、本番Cron、管理APIを実行してはならない。

## 環境

環境変数名は`.env.example`、構築手順は`SUPABASE_SETUP.md`を参照する。`.env.local`の値を表示してはならない。Client Componentが受け取れるのは、意図的に`NEXT_PUBLIC_`を付けた変数だけである。
