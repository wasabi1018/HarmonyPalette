# ガイド一覧で本文を展開

2026-11-23。ユーザー指定に合わせ、`/guides` のタイトル操作を記事への遷移から同じページ内での本文展開へ変更した。

- My Planのモーダルと共通の `ParkGuideContents` を使用し、カテゴリ・順番・保存済みの本文をそのまま表示する。
- 最初は閉じた状態。複数のガイドを同時に開け、もう一度選ぶと閉じる。
- 個別記事URLと、本文末尾の「記事ページで読む」は保持。タイトル部分にリンクを置かない。
- 一覧の初期HTMLに6個のdetails/summary、全文、個別記事リンクを確認。タイトル内のリンクは0、index許可は維持。実測は `server-html.json`。
- 公開APIの読み取り内容をローカルの使い捨てDBに複製し、PC 1280px・スマートフォン390pxで検証。タイトル選択後もURLは `/guides`、複数同時展開、Enter/Spaceでの開閉、横幅超過なし、console error/warnなしを確認した。
- 画像は `desktop-collapsed.jpg`、`desktop-expanded.jpg`、`mobile-collapsed.jpg`、`mobile-expanded.jpg`。本番DBは変更していない。
- ガイド関連テスト20件、lint、Node.js 24.22.1でproduction build（型検査含む）が成功。検証用サーバーを終了し、viewport指定を解除した。
