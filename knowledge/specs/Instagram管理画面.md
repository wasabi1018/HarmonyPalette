---
type: specification
status: approved
updated: 2026-10-04
owner: project
---

# Instagram管理画面

## 構成

- `/admin/instagram` は機能の入口。作成ツール5種類、DM運用、サイト表示設定を案内する。
- `/admin/instagram/create/[tool]` は作成ツールの個別ページ。混雑予想、推しキャラおすすめ日、全体予定、週間・日別ファンスタジオを扱う。
- `/admin/instagram/dm` はキャンペーン一覧、`dm/new` は下書き作成、`dm/[id]` は素材登録・確認・開始／一時停止、`dm/deliveries` は最近の送信状況。
- `/admin/instagram/settings` はサイトのトップページに掲載するInstagram投稿URLを設定する。
- 共通メニューから各領域へ移動する。管理画面全体のサイドバー項目は「Instagram」1つとする。

## 機能追加

入口の名称・説明・URLは `lib/instagram-admin-tools.ts` にまとめる。独立した作業には個別ページを用意し、色・期間など同じ作業の違いは編集画面内の設定とする。予定画像3種類は共通エディターを再利用する。

## 編集状態と素材の引継ぎ

認証済み管理レイアウトに属するメモリ上の状態で、各ツールの対象条件、混雑予想の編集と元に戻す履歴、投稿URLの未保存変更、DMの入力とPNGファイルを保持する。管理画面内でページを移動して戻った場合も復元する。再読み込み・タブ終了・ログアウト後の復元は保証しない。端末への永続保存は追加しない。

未保存の混雑予想、投稿URL、DM素材・入力がある場合は、再読み込み・タブ終了時にブラウザの確認を使う。管理画面外へリンクで移動する場合も確認する。

推しキャラおすすめ日で「自動DMに使う」を押すと、作成画面内のパネルにPNGと文章を渡す。対象月の下書きを選んで既存の素材登録APIへ登録できる。下書き作成・詳細ページへ移動した場合も、同じ管理セッションで素材を引き継ぐ。登録と自動返信の開始は別操作とする。

## データ境界

既存の管理者認証、画像生成、集計、Storage、DM送信処理を使用する。管理レイアウトはリクエストごとに認証を確認し、ビルド時に認証設定がなくてもログイン転送を事前生成しない。キャンペーン取得APIはID指定に対応し、一覧の最近30件に含まれないキャンペーンも個別取得できる。送信状況は最近の最大100件であり、全期間の合計とは扱わない。DBのスキーマ変更は伴わない。

## 関連コード

- `components/admin/instagram-workspace.tsx`
- `components/admin/instagram-session-provider.tsx`
- `lib/instagram-admin-session.ts`
- `components/admin/instagram-dm-workspace.tsx`
- `app/admin/(protected)/instagram/`
