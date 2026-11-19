# Article image layouts and toolbar popovers — 2026-11-19

Added three layouts to the existing article editor: image left/text right, text left/image right, and two images. Existing single images remain supported. Each layout image uses the existing media picker/upload flow and has editable alternative text and a caption. Swap and unwrap preserve content. Empty image slots appear in the article quality checks without preventing draft saving. No database migration is needed.

Color, link and layout panels render through a portal into `document.body`, outside the toolbar's horizontal scrolling/clipping area. Placement is constrained to the viewport. Outside pointer presses close them; Escape closes the panel and returns focus to the trigger.

## Browser evidence

The local harness bundles the actual `ArticleEditor`, layout NodeViews and `ArticlePreview`, with only Next.js navigation/link adapters. It uses demo-mode persistence, synthetic SVG photo fixtures, and the actual `sanitizeArticleHtml` function for the save/reload round trip. Screenshots were captured in installed headless Chrome at 1× density inside fixed-size frames, then cropped to those frames. These are rendered implementation captures.

| Evidence | CSS viewport | Checks |
| --- | --- | --- |
| `320-editor.png`, `320-editor-metrics.json` | 320 × 844 | 32 passed |
| `390-editor.png`, `390-editor-metrics.json` | 390 × 844 | 32 passed |
| `1280-editor.png`, `1280-editor-metrics.json` | 1280 × 844 | 32 passed |
| `390-preview.png`, `390-preview-metrics.json` | 390 × 1600 | 5 passed |
| `1280-preview.png`, `1280-preview-metrics.json` | 1280 × 1600 | 5 passed |

Editor checks cover toolbar insertion of all three layouts, selection of the correct media slot, local file upload into a slot, swap/unwrap, JSON reload, sanitized HTML reload with images/captions/text retained, image loading, responsive column positions, stable toolbar geometry during body scrolling, and horizontal overflow. Selected text receives the chosen blue; the palette is fully hit-testable above the toolbar without vertical toolbar overflow. Link entry is likewise visible. Global JavaScript errors and unhandled rejections were empty.

The published preview uses the sanitized output and the actual article presentation component. All four sample photos load. Desktop uses equal-width columns with a 24px gap; mobile uses document-order vertical stacking with a 16px gap. No horizontal page overflow was observed.

## Code validation

- 12 article layout/content-presentation/media-URL tests passed, including unsafe HTML removal and preserving old single-image content.
- 7 guide tests and 56 existing Rakuten tests passed.
- Full ESLint, standalone TypeScript and production build passed in the isolated checkout of current master. The installed local runtime is Node 22.12.0; the repository's existing deployment engine requirement remains Node 24.22.1 or later within 24.x.
- React review: editor controls are excluded from serialized content, existing server boundaries and sanitizer remain in place, callback targets use live NodeView positions, panel listeners are cleaned up, and no dependency was added.

## Limits

No production article or Storage data was changed for testing. Real authenticated database persistence and a physical Android/iOS device were not exercised; browser testing uses local fixtures and the real schema/sanitizer. This pass resolves the previously unverified 2026-11-19 color/link popover follow-up. Git push/deployment status is reported separately.
