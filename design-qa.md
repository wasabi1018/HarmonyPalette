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

# Schedule Monthly Calendar & Day Dialog — Design QA

## Scope

- `/schedule` のカレンダー表示を、検索期間に含まれる対象月単位へ変更。
- 検索範囲外および隣接月の補完日を非活性表示。
- スマホは1か月、PCは最大2か月を同じ月グリッドデザインで表示。
- 対象日の全予定を確認する日付ダイアログと、キャラクター誕生日表示を追加。

## Visual truth and evidence

- Source visual truth: `C:/Users/mkcs1/AppData/Local/Temp/codex-clipboard-fefa3388-79fc-489a-8601-12e263998034.png`
- Desktop implementation: `C:/Harmony Palette/audit/62-schedule-month-calendar-desktop-focused.png`
- Desktop dialog: `C:/Harmony Palette/audit/61-schedule-day-dialog-desktop.png`
- Mobile implementation: `C:/Harmony Palette/audit/64-schedule-month-calendar-mobile.png`
- Mobile dialog: `C:/Harmony Palette/audit/63-schedule-day-dialog-mobile.png`
- Full-view comparison: `C:/Harmony Palette/audit/65-schedule-month-calendar-full-comparison.png`
- Focused calendar comparison: `C:/Harmony Palette/audit/66-schedule-month-calendar-focused-comparison.png`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source | supplied raster | 455 × 561 | 120 dpi metadata | populated monthly calendar reference |
| Desktop implementation | 1440 × 1024 | 1425 × 1013 browser content | 1× | August and September, empty local dataset |
| Mobile implementation | 390 × 844 | 375 × 811 browser content | 1× | August, empty local dataset |
| Desktop dialog | 1440 × 1024 | 1425 × 1013 browser content | 1× | August 7 empty day |
| Mobile dialog | 390 × 844 | 375 × 811 browser content | 1× | August 7 empty day |

The full comparison contains the supplied TimeTree-style reference and the browser-rendered mobile route in one image. The focused comparison crops the implementation to the monthly calendar because the source does not include Harmony Palette's surrounding filters, header, or fixed navigation.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: the local Supabase dataset returned zero schedules and zero birthdays for the captured range. Calendar label density with populated data is covered by deterministic preview aggregation and domain tests, but a populated browser capture remains useful follow-up evidence when local approved data is available.

## Required fidelity surfaces

- Fonts and typography: the existing Japanese font stack and Harmony Palette weight hierarchy are preserved. Month titles, weekday labels, day numbers, and compact preview labels retain clear hierarchy without clipping at 390px.
- Spacing and layout rhythm: the reference's seven-column month rhythm is reproduced with a fixed six-week grid. Mobile presents one month without horizontal overflow; desktop uses the same component in a two-column layout.
- Colors and visual tokens: existing pink, sky, lavender, ink, and warm event colors map to Sundays, Saturdays, birthdays, Fan Studio, and events. Disabled dates use reduced contrast and cannot be activated.
- Image quality and asset fidelity: no new raster assets were required. The existing Harmony Palette logo remains unchanged; all calendar and dialog icons use the project's existing Lucide icon library.
- Copy and content: the UI explains target-month behavior, disabled search-range dates, and the day-detail interaction. Birthday copy uses a distinct all-day card without time, location, or My Plan controls.

## Interaction and accessibility checks

- Mobile next/previous month controls switch between August and September.
- PC renders August and September side by side with the same month component.
- August 6 is disabled for an August 7 search start; August 7 opens the day dialog.
- Adjacent-month dates remain disabled even when that date is active in its own month panel.
- The dialog opens as a centered PC dialog and a mobile bottom sheet, closes from its button and Escape, restores focus, traps Tab focus, and locks background scrolling.
- Active date cells have full-date accessible names; disabled cells announce that they are outside the search target.
- Mobile document width does not exceed the viewport, and the browser console reports no errors or warnings.
- Focused birthday and monthly-calendar tests, ESLint, and the production build pass.

## Comparison history

1. The first rendered comparison confirmed the intended responsive structure: Sunday-first seven-column grid, six stable week rows, inactive out-of-range dates, a single mobile month, two desktop months, and a day dialog. No actionable P0, P1, or P2 mismatch was found, so no visual correction pass was required.

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

# Homepage Instagram Official Embed — Design QA

## Scope

- Added an `Instagram` section immediately after the latest-articles area and before the footer.
- Uses Instagram's official embed script and canonical post permalinks.
- Shows two official posts on desktop and one official post on mobile.
- Links the section handle and mobile CTA to `@harmony__palette`.

## Visual truth and evidence

- Selected source mock: `C:/Users/mkcs1/.codex/generated_images/019facb5-99bf-7df0-be21-7a333c14cec9/call_XdRwbU0mUNSM2e5ls2YwRj0e.png`
- Desktop implementation: `C:/Harmony Palette/audit/61-home-instagram-qa-desktop.png`
- Mobile implementation: `C:/Harmony Palette/audit/60-home-instagram-mobile-section.png`
- Final side-by-side comparison: `C:/Harmony Palette/audit/62-home-instagram-design-qa-comparison.png`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source mock desktop crop | 1136 × 1024 | 1136 × 1024 | source raster | guide, latest articles, Instagram |
| Desktop implementation | 1136 × 1024 | 1136 × 1024 | 1× | two official Instagram embeds |
| Mobile implementation | 390 × 844 | 375 × 844 content | 1× | one visible official Instagram embed |
| Comparison | side by side | 2272 × 1024 | 1× | selected mock + implementation |

## Comparison history

1. The first implementation used post URLs containing the account-name prefix. Instagram's script did not expand those blockquotes, so only the fallback cards appeared.
2. The permalinks were changed to Instagram's canonical `/p/{shortcode}/` form. Both desktop iframes then rendered at provider-controlled heights of 856 and 854 pixels.
3. Mobile was rechecked at 390 × 844: the first iframe rendered at 635 pixels, the second remained hidden, and no horizontal overflow appeared.

## Required fidelity surfaces

- Typography: the existing Harmony Palette display and body styles are retained; the heading copy is exactly `Instagram`.
- Layout: the approved order is preserved—first-visit guide, latest articles, Instagram, then footer.
- Color and spacing: existing pink, ink, border, and spacing tokens are reused.
- Image fidelity: post content is rendered by Instagram's official iframe rather than duplicated site assets or recreated cards.
- Copy: the account handle is `@harmony__palette`; fallback and mobile links use concise Japanese labels.

## Functional checks

- Two official post iframes are visible at the desktop breakpoint.
- One official post iframe is visible at the mobile breakpoint.
- Account and post links open Instagram in a new tab.
- The official `https://www.instagram.com/embed.js` script loads and processes the blockquotes.
- The page has no console errors or warnings in the final desktop and mobile checks.
- The mobile page has no horizontal overflow.
- Organization structured data includes the Instagram account in `sameAs`.
- `npm run lint` and `npm run build` pass.

## Severity review

- P0: none.
- P1: none.
- P2: none.
- P3: official Instagram embeds are taller and contain provider-owned controls/content that differ from the static mock; this is an accepted constraint of the requested official embed.

## Final result

final result: passed

---

# Homepage Article Routing — Design QA

## Scope

- Removed public navigation and homepage sections for goods, standalone events, and surrounding information.
- Kept a focused “初めての方へ” guide entry on the homepage.
- Replaced the former preparation/event/travel content area with a latest-articles section.
- Added responsive desktop and mobile states for the new guide and article surfaces.

## Visual truth and evidence

- Source visual truth: `C:/Users/mkcs1/AppData/Local/Temp/codex-clipboard-d10d3c7d-c1d8-4bfa-a97e-e580291397d6.png`
- Desktop implementation: `C:/Harmony Palette/audit/52-top-latest-section-desktop.png`
- Mobile implementation: `C:/Harmony Palette/audit/56-top-guide-latest-mobile-final.png`
- Side-by-side comparison: `C:/Harmony Palette/audit/57-home-content-redesign-comparison.png`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source | supplied raster | 1530 × 680 | source raster | former preparation, event, and travel sections |
| Source normalized | 1530 × 900 target | 1530 × 900 | contained without crop | former content direction |
| Desktop implementation | 1530 × 900 | 1530 × 900 | 1× | guide CTA, latest-articles empty state |
| Mobile implementation | 390 × 844 | 390 × 844 | 1× | guide CTA, latest-articles heading, fixed navigation |

The desktop source and implementation were combined into one comparison image. A focused mobile capture was also used because responsive wrapping and the fixed bottom navigation are not represented by the desktop source.

## Comparison history

1. The first comparison found no actionable P0, P1, or P2 visual mismatch. The new content intentionally changes the source information architecture while retaining its typography, pink-accent hierarchy, card radii, borders, shadows, and spacing rhythm.
2. No visual correction pass was required.

## Required fidelity surfaces

- Fonts and typography: the existing display and Japanese body stacks, optical weights, line heights, and pink eyebrow labels are preserved.
- Spacing and layout rhythm: the guide CTA and latest-articles block retain the source 1200px content width, section spacing, rounded cards, and responsive single-column mobile behavior.
- Colors and visual tokens: existing pink, ink, warm guide yellow, subtle border, and shadow tokens are reused without introducing a competing palette.
- Image quality and asset fidelity: the supplied Harmony Palette logos remain unchanged and sharp. Article cover images use existing uploaded assets when present; the empty state uses the established icon library.
- Copy and content: the removed event/travel content is absent, “初めての方へ” remains prominent, and “最新記事” links to the article index.

## Functional checks

- Desktop navigation contains only 今日の予定, マイプラン, キャラクター, 初めての方へ, and 記事.
- Mobile bottom navigation replaces 周辺情報 with 記事.
- The homepage guide CTA opens `/guide`.
- `/goods` permanently redirects to `/articles`; the same redirect implementation is used for the removed event and surrounding-information routes.
- `/guide` renders the guide article listing and an intentional empty state when no guide articles are published.
- Browser console reported no errors or warnings.
- `npm run lint` and `npm run build` pass.

## Severity review

- P0: none.
- P1: none.
- P2: none.
- P3: article cards could not be visually exercised because the connected database does not yet contain a published article using the new destination field; the empty state was verified instead.

## Final result

passed

---

# Schedule Calendar & Multi-select Events — Design QA

## Scope

- `/schedule` の一覧／カレンダー切り替え。
- キャラクターとイベント名の複数選択。
- 14日型カレンダーでのイベント名・検索対象キャラクター名の表示。
- ファンスタジオ予定の1日1枠への集約。

## Visual truth and evidence

- Source visual truth: `C:/Users/mkcs1/.codex/generated_images/019fa8b7-92dc-7171-9de0-da74b6dd084b/call_1vi9CqINoHQnXipbyxuOrBtB.png`
- Final desktop implementation: `C:/Harmony Palette/audit/49-schedule-calendar-desktop-final.jpg`
- Final mobile implementation: `C:/Harmony Palette/audit/46-schedule-calendar-mobile.png`
- Normalized source: `C:/Harmony Palette/audit/47-schedule-calendar-reference-normalized.jpg`
- Final side-by-side comparison: `C:/Harmony Palette/audit/50-schedule-calendar-design-qa-final.jpg`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source | design raster | 1487 × 1058 | source raster | calendar, 2 characters and 2 events selected |
| Source normalized | 1425 × 1013 target | 1425 × 1013 | normalized to implementation | same |
| Desktop implementation | 1440 × 1024 | 1425 × 1013 browser content | 1× | calendar, 2 characters and 2 events selected |
| Mobile implementation | 390 × 844 | 375 × 811 browser content | 1× | stacked calendar cards |

The full-view comparison keeps both desktop artifacts at identical pixel dimensions. Focused crops were not required because filter labels, event names, character names, and Fan Studio group rows are readable in the full comparison.

## Comparison history

1. Initial implementation used the original 1180px page width and 260px calendar cards. Seven columns felt compressed, character names wrapped too aggressively, and the footer entered the comparison viewport. These were P2 layout and density findings.
2. The schedule page width was increased to 1360px, desktop calendar cards were increased to 300px, and the view toggle was moved beside the result heading.
3. The post-fix comparison confirms the selected direction: two rows of seven dates, compact event/character pairs, one lavender Fan Studio block per date, pink selected-day treatment, and the view switch beside the heading.

## Required fidelity surfaces

- Fonts and typography: existing Japanese font stack, weight hierarchy, line height, and truncation remain readable. Long event titles wrap to two lines without collision.
- Spacing and layout rhythm: desktop uses seven balanced columns; mobile stacks day cards without horizontal overflow. Grid, filter summary, and result spacing follow the source hierarchy.
- Colors and visual tokens: existing pink, plum, lavender, sky, and warm event accent tokens match the source direction and retain sufficient contrast.
- Image quality and asset fidelity: the existing source logo is preserved and remains sharp. No raster placeholders, CSS drawings, or replacement SVG artwork were introduced.
- Copy and content: event cells contain only event names and matching selected character names. Fan Studio appears exactly once per date with an aggregate slot count.

## Functional checks

- List and calendar buttons switch both directions and update the URL.
- Character and event controls accept multiple checkbox selections.
- Adding a third event updates the selected count and persists repeated `event` query parameters.
- Calendar results contain only selected event titles plus the single Fan Studio aggregate.
- Multi-day date range and weekday/date pairs are correct for 2026-07-28 through 2026-08-10.
- Desktop and mobile views have no horizontal overflow.
- Browser console reported no errors or warnings.
- `npm run lint` and `npm run build` pass.

## Severity review

- P0: none.
- P1: none.
- P2: none remaining.
- P3: the source mock shows removable character artwork chips; the implementation intentionally keeps the existing product's text-first chip style and manages removal through the checkbox panel.

## Final result

passed

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

---

# Instagram Fan Studio Weekly Schedule — Design QA

## Scope

- Added a Fan Studio template to the existing Instagram image generator.
- Included every-day characters in the same weekly table as other characters.
- Added an editable label for the special-appearance legend.
- Kept the existing 1080 × 1350 output size, theme selector, weekly/monthly generation, caption copy, PNG export, and ZIP export.

## Visual truth and evidence

- Selected source mock: `C:/Harmony Palette/audit/instagram-fanstudio-source.png`
- Normalized source: `C:/Harmony Palette/audit/instagram-fanstudio-source-normalized.png`
- Browser-rendered implementation: `C:/Harmony Palette/audit/instagram-fanstudio-implementation.png`
- Final side-by-side comparison: `C:/Harmony Palette/audit/instagram-fanstudio-comparison.png`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source mock | design raster | 1122 × 1402 | source raster | pink theme, 7/27–8/2, 9 characters |
| Normalized source | 1080 × 1350 target | 1080 × 1350 | normalized to output | same |
| Implementation | 1080 × 1350 card | 1080 × 1350 | 1× output target | pink theme, 7/27–8/2, 9 characters, default legend |
| Comparison | side by side | 2160 × 1350 | 1× | normalized source + implementation |

The complete output remains readable in the full-view comparison, so focused crops were not necessary.

## Comparison history

1. The first browser capture exposed a compressed header and a table positioned too high compared with the selected source.
2. The brand lockup, schedule labels, title, centered legend, table header, row stack, and footer were rebalanced to match the source hierarchy and vertical rhythm.
3. The final comparison confirms the selected direction: compact editorial header, solid pink weekday header, separate rounded white character rows, centered two-heart legend, and no standalone every-day-character panel.

## Required fidelity surfaces

- Typography: the existing Japanese font stack and heavy-weight hierarchy are retained; character names and weekday labels remain legible.
- Layout: the title/date/legend hierarchy and the table start line match the selected source, with all nine rows fitting inside the 4:5 image.
- Color: the current Harmony Palette pink theme is used for regular appearances, with the configured secondary theme color for special appearances.
- Components: hearts use the existing Lucide icon set; no replacement artwork or placeholder visual was added.
- Copy: the special-appearance legend is rendered from the administrator-editable string and reused in the generated caption.

## Functional checks

- The existing overview template remains the default.
- Switching to the Fan Studio template uses all Fan Studio greeting entries in the selected period.
- Characters marked as Fan Studio regulars receive normal hearts for every day and remain ordinary table rows.
- A special entry overrides the normal heart for the same character/date.
- Weekly PNG and monthly ZIP filenames distinguish Fan Studio output while preserving the existing overview filename format.
- The deterministic QA render contains all 7 dates, all 9 character rows, regular hearts, and special hearts.
- Browser console reported no errors or warnings.
- `npm run build` passes.

## Severity review

- P0: none.
- P1: none.
- P2: none remaining.
- P3: browser QA used the deterministic output-card harness because the production administrator route requires an authenticated session.

## Final result

passed

---

# Instagram Fan Studio Daily Schedule — Design QA

## Scope

- Added a one-day Fan Studio Instagram template.
- Uses start times as the vertical axis and only rooms with schedules as horizontal columns.
- Displays character names in cells and appends a configurable emoji only to special appearances.
- Provides separate administrator inputs for the emoji and its meaning.

## Visual truth and evidence

- Selected source mock: `C:/Harmony Palette/audit/instagram-fanstudio-daily-source.png`
- Normalized source: `C:/Harmony Palette/audit/instagram-fanstudio-daily-source-normalized.png`
- Browser-rendered implementation: `C:/Harmony Palette/audit/instagram-fanstudio-daily-implementation.png`
- Final side-by-side comparison: `C:/Harmony Palette/audit/instagram-fanstudio-daily-comparison.png`

## Capture details

| Item | CSS viewport | Pixel dimensions | Density | State |
| --- | --- | --- | --- | --- |
| Source mock | generated design raster | 1090 × 1443 | source raster | 2026-07-29, 101/102 rooms, sun emoji |
| Normalized source | 1080 × 1350 target | 1080 × 1350 | normalized to output | same |
| Implementation | 1080 × 1350 card | 1080 × 1350 | 1× output target | 9 time rows, 101/102 rooms, 103 omitted |
| Comparison | side by side | 2160 × 1350 | 1× | normalized source + implementation |

The time labels, room headers, character names, and emoji are readable in the full-view comparison, so a focused crop was not required.

## Comparison history

1. The initial implementation placed the timetable about 25 pixels lower than the selected source and compressed the time rows. The footer copy also approached the brand lockup.
2. The daily header was reduced, the timetable area was expanded, and the footer copy width and type size were tightened.
3. The post-fix comparison confirms matching hierarchy, aligned room columns, readable time rows, and a clear table-external emoji legend.

## Required fidelity surfaces

- Typography: the existing Japanese font stack, heavy display title, tabular time labels, and compact character text remain legible without clipping.
- Layout: the 1080 × 1350 frame, header hierarchy, rounded pink table header, separate white time rows, and footer match the selected direction.
- Color: the existing Harmony Palette pink canvas and accents are retained; no extra state color is introduced for normal appearances.
- Image quality: the output is browser-rendered at the export target size; no raster placeholder, replacement logo, or generated character asset is used.
- Copy: cells contain character names only, special emoji appear after names, and the emoji meaning appears once above the table.

## Functional checks

- The deterministic QA date contains entries for 101号室 and 102号室 only; 103号室 is absent from both the DOM and rendered image.
- Normal appearances contain no dot, heart, emoji, or secondary label.
- Special appearances append the configured emoji after the character name.
- The emoji and meaning are passed independently to the image and generated caption.
- The date template always creates one PNG and uses a daily-specific filename.
- The existing overview and weekly Fan Studio templates remain available.
- Browser console reported no errors or warnings.
- The protected administrator page correctly requires authentication; the output card itself was verified through the deterministic browser harness.
- `npm run build` passes.

## Severity review

- P0: none.
- P1: none.
- P2: none remaining.
- P3: authenticated administrator input interactions were code- and build-verified but not browser-operated in the unauthenticated QA session.

## Final result

passed
