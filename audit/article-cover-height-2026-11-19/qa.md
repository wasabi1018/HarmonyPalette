# Article cover height — 2026-11-19

Changed the editor's main cover, sidebar cover, empty cover placeholders, and the shared article-detail/preview cover to 16:9 (`aspect-video`). Previously the editor used 4:1, the sidebar 3.4:1 and the public article/preview 3:1, cropping much of a typical landscape image.

Verified the actual `ArticleEditor` and `ArticlePreview` with a synthetic 1280 × 720 SVG that labels its top and bottom edges. The local harness replaces only Next.js framework navigation/link adapters and uses demo mode. Headless Chrome captures use fixed-size frames at 1× density; PNGs are cropped to the exact frame. Screenshots and matching metrics are in this directory.

| View | CSS viewport | Actual image/frame dimensions |
| --- | --- | --- |
| Mobile editor | 390 × 1000 | Main 356 × 200.25px; secondary 358 × 201.375px |
| Desktop editor | 1280 × 1000 | Main 848 × 477px; sidebar 270 × 151.875px |
| Mobile published preview | 390 × 1000 | 356 × 200.25px |
| Desktop published preview | 1280 × 1000 | 862 × 484.875px |
| Mobile empty state | 390 × 1000 | 358 × 201.375px |

All five scenarios passed the ratio, loaded-image, overflow and JavaScript error checks. The 16:9 fixture's top and bottom labels are visible. Full ESLint, production build including type checking, and diff whitespace checks passed in the isolated master checkout.

This is local responsive browser verification, not a physical-device test or authenticated production-content check. Non-16:9 originals still use `object-cover` and may be cropped to fit. No production article or media data was modified.
