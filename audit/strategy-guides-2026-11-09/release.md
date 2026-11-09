# 攻略ガイドDB反映 — 2026-11-09

ユーザーの追加指示に基づき、Harmony Palette本番プロジェクト（`bnbdwstvrjgmfftmmofx`）へ攻略ガイドのMigrationを適用した。

- 適用ID：`20261109001036`、名称：`strategy_guides`。Supabase連携が採番したIDにローカルSQLファイル名と参照を合わせた。
- 適用前に既存スキーマ・公開読み取りポリシーと記事検索関数を確認。検索関数の適用前定義をリポジトリ外の一時領域へ保存した。
- 本番のテーブル既定権限を考慮し、新規2テーブルは公開ロールの既定権限を明示的に取り消してSELECTだけを許可した。SQLテストにも同じ既定権限の条件を追加し、7件成功。変更したテストのlintも実施。
- `guide_settings.preparing = true`、カテゴリ0件、攻略記事0件を確認。既存の記事は21件、公開中19件で適用前後とも変化なし。
- 新規2テーブルのRLS、イベント単位の一意インデックスと一覧インデックスの有効状態を確認。
- anon/authenticatedのINSERT・UPDATE・DELETE・TRUNCATE権限がなく、設定保存RPCはservice_roleだけが実行可能であることを確認。設定保存・記事検索関数はいずれもSECURITY INVOKER。
- 実際にanonロールへ切り替え、準備中設定の読み取りと通常記事検索（9件取得）の成功を確認。既存の「初めての方向け」検索も実行可能（対象記事0件）。
- 適用後のSecurity Advisorsに今回追加したガイド用オブジェクトの指摘はない。既存の管理専用テーブル、更新日時関数、pg_trgm、閲覧カウント関数、漏洩パスワード保護についての指摘は本作業の対象外として保持した。記事検索関数のSECURITY DEFINERに関する指摘は解消。

既存指摘の参照：[Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)、[Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。

記事・カテゴリの作成や公開、準備中の解除は実施していない。アプリのUIと本番ビルドの事前検証は [qa.md](qa.md) を参照。
