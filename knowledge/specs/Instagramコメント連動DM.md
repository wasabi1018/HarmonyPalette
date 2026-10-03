---
type: specification
status: draft
updated: 2026-09-30
owner: project
---

# Instagramコメント連動DM

## 目的

月別Reelのコメントに含まれるキャラクター名に応じて、保存済みランキングPNGと文言をInstagram DMで送る。画像作成自体は[推しキャラおすすめ日画像](推しキャラおすすめ日画像.md)の仕様を使用する。

## 対象

- 対象画面：管理画面のInstagram画像作成
- 対象ユーザー：管理者、対象ReelにコメントするInstagramユーザー
- 対象外：Reelの自動投稿、同じ利用者の再コメントをトリガーとする案内、フォロワー限定ファイル配信の保証

## 期待する挙動

1. 管理者が対象月・ReelメディアIDを持つ下書きを作成し、キャラクター名、複数キーワード、PNG、DM文言を登録する。
2. 管理者が開始すると対象ReelのコメントWebhookだけを処理する。キーワードが複数一致する場合は最長一致を選び、同長で別キャラクターに一致した場合は送らない。
3. コメントIDと「同一キャンペーン・同一利用者」で重複排除し、最初の該当コメントへボタン付きプライベート返信を送る。
4. ボタン押下後にフォローを照会する。フォロワーなら画像・文言を順番に送る。非フォロワーならDM内でフォローと「フォローしました」ボタンを案内し、再照会する。照会結果が不明なら送信する。
5. 画像と文言の両方を送った後、元コメントに「DMでお送りしました！」と返信する。
6. 送信の各段階、MetaメッセージID、判定、失敗を記録する。曖昧な送信失敗は `needs_review` とし、自動で再送しない。
7. 一時停止したキャンペーンは新規受付と次の残作業を止める（既に実行中のMeta APIリクエストは取り消せない）。再開後に処理を再開する。

## 状態

| 状態 | 表示・操作 |
| --- | --- |
| draft | 画像と文言を追加できる。送信しない |
| active | コメント受付と送信を行う |
| paused | 受付・送信を止める |
| awaiting_tap | 初回DMを送信済み。利用者のボタン押下待ち |
| awaiting_follow | 非フォロワーへの案内送信済み。確認ボタン待ち |
| complete | 画像、文言、公開返信を完了 |
| failed / needs_review | 管理画面でエラーを確認し、手動調査が必要 |

## データ

- 正本：`instagram_dm_campaigns`、`instagram_dm_assets`、`instagram_dm_deliveries`、Storage `instagram-dm-images`
- 読み取り：Meta署名検証済みWebhook、管理API、ワーカー
- 変更：コメント・ボタンイベントで送信状態を更新。PNG・文言は登録時点のスナップショット
- 権限：管理者セッションまたはサーバーのservice roleのみ。公開Storageの画像URLは知っていれば閲覧できるため、厳密なフォロワー限定公開ではない

## 関連コード

- `app/api/instagram/webhook/route.ts`
- `app/api/cron/instagram-dm/route.ts`
- `lib/instagram-dm/`
- `components/admin/instagram-dm-campaign-manager.tsx`
- `supabase/migrations/202609300001_instagram_dm_campaigns.sql`

## 受け入れ条件

- [x] 文字の正規化、キーワード衝突、Webhookイベント抽出の単体テスト
- [ ] Metaテストアカウントでプライベート返信、ボタン、画像、フォロー判定、公開返信を実機確認
- [ ] 非フォロワー／不明／重複Webhook／API失敗を実機確認
- [ ] 本番移行後、CronとWebhookの監視を確認

## 未決事項

- Metaアプリの権限審査、トークン更新手順、利用可能なGraph APIバージョンは本番接続前に確認する。
- Meta APIには送信操作の完全なexactly-once保証がない。送信成功直後のDB障害では手動照合が必要。
