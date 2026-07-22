# Design QA: 当日の予定位置への自動スクロール

## Evidence

- Source visual truth: `C:/Users/mkcs1/AppData/Local/Temp/codex-clipboard-b86677a4-4ec2-4776-a934-fdb4382d02b8.png`
- Browser-rendered implementation: `C:/Harmony Palette/audit/23-schedule-results-scrolled-desktop-final.png`
- Side-by-side comparison: `C:/Harmony Palette/audit/24-schedule-scroll-design-qa-comparison.png`
- Source pixels: 1503 x 533 PNG, 120 dpi.
- Implementation capture: 1485 x 527 PNG from a 1500 x 533 CSS viewport override. The in-app browser excludes its scrollbar/chrome from the captured content.
- Density normalization: device scale factor 1. For the comparison, the implementation was normalized to 1503 x 533 so both panels have the same visible comparison area.
- State: 2026-07-23、ウィッシュミーメル選択、開始日と終了日が当日、light theme.

## Full-view comparison

添付画像と実装を同一キャンバス上で比較した。どちらも、当日の見出し・件数・予定カードがページの主要表示領域に入り、余計な検索フォームを経由せず予定を確認できる。実装側の上部にはサイト共通の固定ナビゲーションが残るため、結果セクションはその直下に96pxのスクロール余白を確保している。これは全ページ共通UIによる意図的な差分で、予定カードの情報構造・幅・余白・色・表示内容は添付画像と整合している。

## Focused comparison

横並び比較で、日付見出し、1件表示、グリーティング種別、タイトル、対象キャラクター、時刻、場所、出典、公式情報リンクまで判読できたため、追加の拡大クロップは不要だった。

## Required fidelity surfaces

- Fonts and typography: 既存の日本語フォント、太さ、行間、見出し階層を維持。添付画像と同じ情報密度で折り返しや切れはない。
- Spacing and layout rhythm: 結果セクションは固定ヘッダー直下の約96pxに配置され、日付グループとカードの既存余白・角丸・影を維持している。
- Colors and visual tokens: 既存の白、淡いピンク、濃い本文色、ピンクのアクセントをそのまま利用している。
- Image quality and asset fidelity: この画面に新規の画像アセットはなく、既存アイコンを変更していない。比較画像にはラスター化以外の置換はない。
- Copy and content: 当日の日付、対象キャラクター、予定件数、予定詳細は一致。検索条件の文言や結果カードのコピーは変更していない。

## Interaction and accessibility checks

- ホームの「予定を見る」のリンクに `character`、`from`、`to`、`#schedule-results` が含まれることを確認。
- クリック後のURLで `#schedule-results` が保持されることを確認。
- 開始日と終了日がともに `2026-07-23`、キャラクター欄が `ウィッシュミーメル` になることを確認。
- 結果セクションの表示位置は1500 x 533 viewportで上端から約96px。固定ヘッダーを避けた位置に揃う。
- 結果には `7月23日(木)`、`2026/07/23`、対象予定1件が表示された。
- ブラウザーのコンソールログを確認: エラーなし。

## Comparison history

1. 初回の遷移確認
   - P1: 既に開いていたページではキャッシュ済みのリンクが使われ、結果セクションのフラグメントが遷移先に反映されなかった。
   - Fix: キャラクターカードを明示的なURLを持つリンクにし、`#schedule-results` を直接付与。結果セクションにも同じIDと固定ヘッダー分のスクロール余白を追加した。
   - Post-fix evidence: ブラウザー上のリンク属性と遷移後URLの両方に `#schedule-results` が含まれ、結果上端が約96pxに揃った。
2. 最終比較
   - P0、P1、P2の未解決項目なし。

## Findings

未解決のP0、P1、P2はない。

## Follow-up polish

- P3: 添付画像はサイト共通ヘッダーを含まない切り抜きのため、完全なピクセル一致ではなく、実装では操作性を優先して固定ヘッダー直下に配置している。

## Final result

final result: passed
