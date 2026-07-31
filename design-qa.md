# Phase 2 Article Management — Design QA

## Scope

- Article list, create/edit screen, rich-text editing, preview, draft/publish controls, image insertion, and tag management.
- Public article list/detail pages and tag filtering.
- The selected visual target is the Sidecar Studio desktop editor concept.

## Visual truth and evidence

- Source: `C:/Harmony Palette/audit/article-admin-concepts/01-sidecar-studio.png`
- Initial implementation: `C:/Harmony Palette/audit/phase2-article-editor-desktop.png`
- Final implementation: `C:/Harmony Palette/audit/phase2-article-editor-desktop-v2.png`
- Side-by-side comparison: `C:/Harmony Palette/audit/phase2-article-editor-comparison.png`
- Full-screen preview: `C:/Harmony Palette/audit/phase2-article-preview-desktop.png`
- Generated QA cover: `C:/Harmony Palette/audit/phase2-demo-article-cover.png`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source | 1487 × 1058 | 1487 × 1058 | source raster | editor, link panel open |
| Final implementation | 1487 × 1058 | 1472 × 1048 browser content | 1× | editor, default controls |
| Preview | 1487 × 1058 | 1472 × 1048 browser content | 1× | full-screen preview |

The full desktop comparison remains readable at source resolution, so a separate cropped comparison was not necessary.

## Comparison history

1. The first implementation had a cover image that was too tall and did not repeat the cover thumbnail in the publishing inspector. Both were P2 fidelity findings.
2. The cover was changed to the source-like 4:1 treatment and a compact inspector thumbnail was added.
3. The post-fix comparison confirms the source hierarchy: slim sidebar, wide writing canvas, narrow inspector, restrained pink accents, low-contrast dividers, rounded controls, and visible content hierarchy.

## Functional checks

- Preview opens as a full-screen article view and closes cleanly.
- Tag search and selection work, including adding a filtered tag.
- Draft save updates the saved/dirty state.
- Link insertion applies the entered URL to selected text.
- Text color applies the selected palette color to editor content.
- The generated demo cover renders sharply at the intended aspect ratio.
- Browser console showed no errors or warnings during the completed editor checks.
- Image upload API and editor integration compile successfully. The final browser file-chooser action could not be completed because local-browser file upload was blocked by the browser security policy.
- Responsive layouts are implemented in CSS. An additional live mobile capture was not attempted after that browser policy block; this does not affect the desktop visual target.

## Severity review

- P0: none.
- P1: none.
- P2: none remaining.
- P3: implementation typography is slightly denser than the concept; the concept happens to show its link panel open while the final default-state capture keeps contextual panels closed.

## Image quality and provenance

- The QA cover is an original, generated pastel amusement-park illustration without trademarks, recognizable characters, or text.
- The image is used at its native wide composition and is not visibly stretched or pixelated.

## Final result

passed

---

# Article Editor Fixed Toolbar — Design QA

## Scope

- Keep the rich-text formatting toolbar visible inside the article editor.
- Scroll the article body independently from the surrounding administration page.
- Preserve the existing toolbar controls, styling, and responsive behavior.

## Visual truth and evidence

- Source visual truth: `C:/Users/mkcs1/AppData/Local/Temp/codex-clipboard-1636f3bc-2d6a-45eb-b56d-5d52aecd2981.png`
- Browser-rendered desktop implementation: `C:/Harmony Palette/audit/article-editor-fixed-toolbar-viewport.png`
- Browser-rendered mobile implementation: `C:/Harmony Palette/audit/article-editor-fixed-toolbar-mobile.png`
- Focused comparison: `C:/Harmony Palette/audit/article-editor-fixed-toolbar-comparison.png`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source toolbar crop | supplied crop | 1093 × 82 | source raster, 120 dpi | default formatting controls |
| Desktop implementation | 1280 × 720 | 1265 × 712 browser content | 1× | long article, inner body scrolled |
| Mobile implementation | 390 × 844 | 375 × 811 browser content | 1× | long article, inner body scrolled |
| Focused comparison | normalized canvas | 1093 × 180 | source + implementation crop | toolbar controls visible |

## Comparison history

1. The original implementation let the article body expand with the page, so the formatting toolbar moved out of view during long-form editing.
2. The editor body received a bounded responsive height and its own vertical scroll container. The toolbar remains a separate, non-scrolling row.
3. Post-fix browser evidence shows the desktop body moving from scroll position 3055.2 to 855.2 while the toolbar stayed at 101.35px and page scroll stayed at 427.2px. On mobile, the body moved from 1690.4 to 490.4 while the toolbar stayed at 277.05px and page scroll stayed at 124.8px.

## Required fidelity surfaces

- Fonts and typography: the existing Japanese font stack, sizes, weights, and editor line height are unchanged.
- Spacing and layout rhythm: the toolbar retains its border, padding, control spacing, and rounded editor frame; only the article body gains a bounded scroll viewport.
- Colors and visual tokens: existing white, ink, pink, divider, focus, and active-state tokens are unchanged.
- Image quality and asset fidelity: existing Lucide toolbar icons and image insertion controls are preserved; no replacement assets were introduced.
- Copy and content: every formatting label and control remains unchanged. A descriptive toolbar label was added for assistive technology.

## Functional checks

- Desktop article content scrolls independently and the toolbar coordinates remain unchanged.
- Mobile article content scrolls independently and the toolbar coordinates remain unchanged.
- Page scroll position does not change while the article body is scrolled.
- The body scroll viewport is 432px high on the tested desktop and 473px high on the tested mobile viewport.
- The browser console reported no errors or warnings.
- Targeted lint and the production build pass.

## Severity review

- P0: none.
- P1: none.
- P2: none remaining.
- P3: the mobile toolbar keeps its existing horizontal scrollbar so all formatting controls remain reachable.

## Final result

final result: passed

---

# Character Birthday Card Countdown — Design QA

## Scope

- Removed the standalone “もうすぐ誕生日” section.
- Moved birthday timing into each character card, directly beside the birthday date.
- Display timing only from 30 days before the birthday through the birthday itself.

## Visual truth and evidence

- Source: `C:/Users/mkcs1/AppData/Local/Temp/codex-clipboard-29d16a58-0f78-4550-a630-5a688efec2e2.png`
- Implementation route: `http://127.0.0.1:3000/characters`
- Comparison input: the supplied source and the live desktop card capture were combined into one visual review.
- Desktop viewport: 1207 × 900 CSS pixels.
- Mobile viewport: 390 × 844 CSS pixels.

## Functional checks

- The standalone birthday section is absent.
- ポムポムプリン displays “今日が誕生日！” beside “誕生日 7月28日”.
- マイメロディ displays “あと2日” beside “誕生日 7月30日”.
- ハローキティ displays “誕生日 11月1日” without a timing badge because it is more than 30 days away.
- The mobile layout has no horizontal overflow.
- Browser console showed no errors or warnings.

## Severity review

- P0: none.
- P1: none.
- P2: none.
- P3: none.

## Final result

passed
