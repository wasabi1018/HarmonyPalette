---
type: specification
status: approved
updated: 2026-10-06
owner: project
---

# 楽天API設定

楽天API取得後に、管理画面から接続情報を登録できるようにする。この画面の対象は設定・保存・接続確認。TOPの商品紹介は[楽天PR掲載枠](楽天PR掲載枠.md)で管理し、記事などへの配置も同じ掲載枠の仕組みで追加する。

## 利用方法

1. 管理者としてログインし、管理メニューの「楽天API設定」（`/admin/rakuten`）を開く。
2. 同じ楽天アプリで発行されたアプリIDとアクセスキーを入力する。
3. 商品紹介に利用する場合はアフィリエイトIDも入力する。
4. 「接続を確認」で楽天市場の商品検索が成功するか確認する。商品名とアフィリエイトリンクの取得状況を表示する。
5. 「設定を保存」で登録する。接続確認のみでは保存しない。

楽天ウェブサービス側で、画面に表示したサイトURLと楽天市場の商品検索APIの利用設定を確認する。実際の楽天APIへの接続確認は、利用者が認証情報を入力した後に行う。

## 入力と表示

- 初回はアプリIDとアクセスキーが必須。アフィリエイトIDは任意。
- すべての値をマスクして入力し、保存後は入力欄を空にする。
- 保存済みの項目は空欄で現在の値を維持する。空欄による削除は提供しない。
- アプリIDを変更するときはアクセスキーも入力する。キーだけの更新は可能。
- 保存済みの値は画面やAPI応答に返さず、登録有無と保存日時だけを返す。
- 未保存の入力はフォーム内のメモリーに限る。共有セッション状態・localStorage・sessionStorageには保存しない。
- 未保存の入力がある場合、ページ終了や別ページのリンクへの移動で破棄確認を行う。
- 保存先が読み込めない場合は入力と操作を無効にし、既存設定を上書きしない。

## 保存と認証

- Supabase Storageの専用非公開バケット `integration-secrets`、オブジェクト `rakuten.json` を利用する。初回保存時にサーバーから非公開でバケットを作成する。
- `SUPABASE_SECRET_KEY` または `SUPABASE_SERVICE_ROLE_KEY` を持つサーバーの管理用クライアントでのみ読み書きする。公開キーへのフォールバックはしない。
- バケットが公開になっていた場合は読み取り・保存・接続確認を拒否する。このバケットに公開・一般利用者向けのStorage読み取りポリシーを追加しない。
- 機密情報を扱うモジュールは `server-only`。クライアントへのpropsは登録状態だけ。
- 管理ページとAPIは既存の管理者判定に従う。APIの全メソッドで `getAdminAccess()` を確認する。
- API応答と外部APIの取得は `no-store`。別オリジンからの更新・確認リクエストは拒否する。
- 新規の楽天用環境変数・DBテーブル・マイグレーションは不要。

## 接続確認

- API入口: `/api/admin/rakuten-settings`。GETは登録状態、PUTは保存、POSTは接続確認。
- POSTは入力内容を保存済みの値と組み合わせて確認し、Storageには書き込まない。
- 楽天市場商品検索APIの2026-07-01版を利用する。`applicationId` と任意の `affiliateId` はクエリー、`accessKey` はヘッダーで送る。
- 「タオル」を検索し、画像あり・販売中の商品を最大3件確認する。表示用に返すのは商品名とリンク確認の結果のみ。
- HTTPSかつ楽天アフィリエイトのホストのURLを取得できた場合にリンク確認成功とする。
- 接続先は固定。リダイレクトは拒否、タイムアウトは10秒。
- 接続エラーや楽天の応答本文・URLをそのまま画面へ返さない。入力値やアクセスキーをログ出力しない。
- 商品名を表示する接続結果には楽天Developersのクレジットリンクを掲載する。
- 保存時は楽天PRの商品キャッシュと登録済みの掲載ページを再検証する。

## 実装と検証資料

- `components/admin/rakuten-settings-form.tsx`
- `lib/rakuten-settings-input.ts`、`lib/rakuten-settings.ts`、`lib/rakuten-api.ts`
- `lib/rakuten-settings.integration.test.ts`（`npm run test:rakuten`）
- `audit/rakuten-settings-2026-10-06/qa-report.md`
- [楽天市場商品検索API仕様](https://webservice.rakuten.co.jp/documentation/ichiba-item-search)、[アプリ登録ガイド](https://webservice.rakuten.co.jp/guide)、[クレジット指定](https://webservice.rakuten.co.jp/guide/credit)
