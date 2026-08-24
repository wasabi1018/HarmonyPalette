---
type: index
status: approved
updated: 2026-08-24
owner: project
---

# Harmony Palette ナレッジベース

このVaultは、Harmony Paletteの仕様、技術、設計判断、運用ルールを日本語で管理する入口です。実装コードや運用データを複製せず、「どこが正本か」と「なぜその方式か」を追える状態を保ちます。

## 最初に読む

- [運用ガイド](運用ガイド.md)：ノートの状態、更新条件、Codexとの役割分担
- [システム全体像](architecture/システム全体像.md)：サービス全体の構成
- [データの正本](architecture/データの正本.md)：仕様、コード、Supabase、QAの責任分界
- [技術構成マップ](technology/技術構成マップ.md)：採用技術と利用場所
- [仕様索引](specs/仕様索引.md)：機能仕様と既存資料への入口

## 領域別

### 技術

- [フロントエンド](technology/フロントエンド.md)
- [データベースと認証](technology/データベースと認証.md)
- [記事管理と画像処理](technology/記事管理と画像処理.md)
- [公式データ取り込み](technology/公式データ取り込み.md)
- [テストと品質管理](technology/テストと品質管理.md)
- [デプロイと運用](technology/デプロイと運用.md)
- [ライブラリ一覧](technology/ライブラリ一覧.md)

### 設計・運用

- [データの流れ](architecture/データの流れ.md)
- [Obsidianを文書管理に使用する](decisions/ADR-000-Obsidianを文書管理に使用する.md)
- [ドキュメント更新ルール](operations/ドキュメント更新ルール.md)
- [用語集](glossary/用語集.md)

## リポジトリ内の既存資料

以下はVaultの外にあるため、リポジトリルートからパスを開きます。

- `SUPABASE_SETUP.md`：Supabaseの構築・認証・運用設定
- `design-qa.md`：デザイン基準とQA判断
- `audit/`：画面キャプチャと検証証跡
- `drafts/`：記事原稿
- `package.json`：依存パッケージと実行コマンドの正本
- `supabase/migrations/`：データベース変更履歴の正本

## 状態の意味

| status | 意味 |
| --- | --- |
| `draft` | 検討中。確定仕様として実装しない |
| `review` | 確認待ち。実装前に差異を確認する |
| `approved` | 現在の実装基準として利用する |
| `deprecated` | 新規実装では使用しない |
| `archived` | 履歴としてのみ参照する |
