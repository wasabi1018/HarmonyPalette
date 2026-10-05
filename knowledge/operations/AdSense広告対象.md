---
type: policy
status: approved
updated: 2026-10-05
owner: project
---

# AdSense広告対象

`lib/adsense.ts`の`isAdSenseEligiblePage`で公開画面の広告対象を判定する。トップと記事詳細を対象とし、予定検索、キャラクター一覧、記事一覧、記事検索・絞り込み、シリーズ一覧を対象外とする。記事フィードも対象外とする。

`components/adsense-auto-ads.tsx`は対象ページでのみ広告スクリプトを読み込む。既存のproduction環境限定とnoindexページを除外する条件を維持する。

この設定はサイト側で広告を読み込む画面を制御する。AdSenseの申請対象を記事詳細だけに限定する設定ではない。
