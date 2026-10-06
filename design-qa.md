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

---

# Homepage Centered Logo — Design QA

## Scope

- Removed the hero headline “今日の「会いたい」が、すぐ見つかる。”
- Added the supplied Harmony Palette logo treatment without the operating-hours card.
- Centered the logo, supporting copy, and actions at the desktop breakpoint while preserving the mobile layout.

## Visual truth and evidence

- Supplied reference: `C:/Users/mkcs1/AppData/Local/Temp/codex-clipboard-f2cf50e2-b6a2-40bd-bc54-4e266c308ce6.png` (415 × 291)
- Desktop browser render: `C:/Harmony Palette/audit/73-home-logo-centered-desktop.png` (1515 × 891)
- Mobile browser render: `C:/Harmony Palette/audit/74-home-logo-mobile.png` (375 × 835)
- Side-by-side comparison: `C:/Harmony Palette/audit/75-home-logo-centered-comparison.png` (2000 × 680)

The requested target is the hero logo region, which is fully readable in the side-by-side comparison; no additional focused crop was necessary.

## Comparison history

1. The supplied image establishes the illustrated Harmony Palette logo inside a white rounded card.
2. The implementation reuses the existing full-resolution `logo-hero.png` asset, removes the operating-hours panel, and positions the logo card on the page centerline.
3. Desktop and mobile browser captures confirm the image is not clipped or stretched and the supporting text and actions remain readable.

## Required fidelity surfaces

- Logo: exact existing Harmony Palette artwork; no redrawing or placeholder treatment.
- Layout: centered logo card on desktop, full-width responsive card on mobile.
- Copy: the former hero headline is absent; the existing explanatory copy remains.
- Responsive behavior: no horizontal overflow or clipped hero content at 1530 × 900 and 390 × 844 CSS viewports.

## Severity review

- P0: none.
- P1: none.
- P2: none.

## Final result

passed

# TOP option 2 and editable guide cards — 2026-10-05

## Authoritative source and scope

- Selected source: `audit/top-plan-2026-10-05/option-2-selected.png` (1536 × 1024). This is the second image selected by the user.
- Approved refinements: `audit/top-plan-2026-10-05/proposal-option-2-ja.md`. Use 最新記事 with the latest two published articles, preserve the full timeline and today's characters, retain the site's navigation, and add three guides below the timeline.
- The current request authorizes implementation and editing the guide headings, URLs, and descriptions through the admin screen. It does not request a new deployment or push.

## Evidence

| File | CSS viewport | Actual raster | State |
| --- | --- | --- | --- |
| `01-desktop-top.png` | 1280 × 900 | 1265 × 889 | TOP, 2026-10-05, after the published schedules ended |
| `13-desktop-1024-top.png` | 1024 × 1024 | 1009 × 1009 | Width near the selected source's desktop panel |
| `02-mobile-top.png` | 390 × 844 | 375 × 811 | Initial viewport, two real latest articles |
| `03-mobile-375-top.png` | 375 × 844 | 360 × 810 | Narrow mobile, no horizontal overflow |
| `04-mobile-schedule-jump.png` | 390 × 844 | 375 × 811 | After the primary link reaches the schedule |
| `05-guide-cards-desktop.png` | 1280 × 900 | 1280 × 900 | Three guide columns below the timeline |
| `09-guide-cards-mobile.png` | 390 × 844 | 375 × 811 | Three vertically arranged guides |
| `06-admin-form-saved-desktop.png` | 1280 × 900 | 1265 × 889 | Actual form in the isolated QA harness, saved state |
| `08-admin-form-mobile.png` | 375 × 844 | 360 × 2078 | Actual form in the isolated QA harness, full page |

Raster dimensions reflect the in-app browser's content capture, including scrollbar and capture scaling differences. CSS dimensions and element measurements are stored in `desktop-metrics.json`, `mobile-390-metrics.json`, and `mobile-375-metrics.json`.

`11-desktop-source-comparison.png` combines the cropped source desktop panel and the 1024px implementation viewport, each resized proportionally to 640px wide. `12-mobile-source-comparison.png` combines the cropped source mobile panel and the actual mobile initial viewport, each proportionally normalized to 375px. These are combined side-by-side artifacts, not separate views. The shorter initial viewport is padded rather than stretched. Screenshots of the schedule jump and guides document content below that viewport.

## Comparison history and findings

1. First pass: the new article image initially failed under sandbox network restrictions (upstream EACCES). Restarting the local preview with authorized read access resolved it; both covers then loaded. This was an environment problem, not a production code change.
2. First mobile pass: the schedule heading moved from the previous baseline of about 1202px to 1309px. The birthday dates were shortened visually to M/D while retaining full accessible labels, names were arranged with wrapping, and excess section spacing was reduced. No names or timeline rows were removed and fonts were not reduced.
3. Final mobile pass: the heading is at 1197px at both tested widths, latest articles at 385px. All three top actions fit within the first viewport (48.75px primary height, 44px secondary heights). Clicking the primary link places the schedule heading at 142px from the viewport top after the smooth scroll settles.
4. Final comparison: the compact introduction, blush today panel, two article cards/rows, and birthday strip follow the selected order. Approved content changes explain the longer real titles, the updated second article, the extra introduction on mobile, the retained header, and the additional character section before the full timetable.
5. Small text and primary controls received darker pink and secondary foreground colors. White against the new primary pink `#c94372` is 4.64:1, and the link foreground `#b43e68` against white is 5.48:1. The pale panels and existing Lucide icon family are preserved.

## Functional checks

- Full production build, including TypeScript and Next.js lint: passed.
- Standalone ESLint: passed. Existing audit and draft artifacts are excluded from application lint/type checking; app, library, component and test code remain checked.
- 16 unit tests passed, including existing birthday behavior, safe guide URLs and field limits, and today status transitions. Missing schedules never imply closure or completion.
- 3 integration tests passed using the actual API and repository with isolated Storage/auth mocks: save/read all fields and invalidate TOP; deny signed-out and non-admin users; reject invalid links and preserve previous settings on storage failure.
- Browser form verification used the actual form, provider, route and repository with in-memory Storage at localhost:3100. Changed the first card's heading, URL and description, verified the live preview, saved, reloaded, and verified the persisted fields. The public guide component subsequently read and displayed the saved fields. Dangerous URLs were rejected visibly. The harness was stopped after verification; no production settings were written.
- The actual protected admin page redirects an unauthenticated browser to the existing login screen; actual unauthenticated settings API returns 401. No application authentication bypass was added.
- The default three public guide destinations all returned HTTP 200.
- The real TOP's existing plan button changes aria-pressed false → true when adding an event and returns to false after cancellation. Restored the initial local state.
- No horizontal overflow at 375px, 390px, 1024px or 1280px. Labels, guides and the existing schedule lanes remain legible. Existing article photos and logos are used, with no new character images.
- No application JavaScript errors observed. One existing external AdSense warning, “head tag doesn't support data-nscript attribute”, remains outside this UI change.

## Severity review

- P0: none.
- P1: none.
- P2: none remaining after the spacing and contrast corrections.
- P3: the concept's decorative castle backdrop and gradient ornamentation are omitted in favor of the existing visual tokens and real assets; the selected layout and functionality are present. The existing AdSense script warning is recorded above.

## Final result

passed — for the approved refined layout and editable guide form, within the local verification scope. Deployment, a production authenticated save, and AdSense approval are not claimed.

## Follow-up: mobile character alignment — 2026-10-05

The user identified an alignment defect in the free-wrapping character list that the initial QA missed. Fixed it with 2 columns below 480px, 3 columns from 480px, and the existing 4 desktop columns from 1024px. Names, font size and order are preserved. Compact row spacing keeps the schedule heading at 1201px on 375px and 390px screens.

Verified aligned column positions and all 16 names without overflow at 375px, 390px, 532px and 1280px; browser error/warn output was empty. ESLint and the production build passed. Evidence and detailed measurements are in `audit/top-mobile-character-fix-2026-10-05/qa.md`, `metrics.json` and the screenshots in that directory. P2 resolved; local preview updated, no production deployment.

## Follow-up: birthday decoration — 2026-10-05

Added a white circular cake icon with a small sparkle, a subtle pink/lavender gradient and corner stars, character theme-color dots, white cards and date badges. Mobile uses stacked name/date cards; desktop places them inline. The three current names and dates fit without horizontal overflow at 375px, 390px, 532px, 768px and 1280px. The mobile band's height increases by about 4px; desktop height is unchanged. Birthday logic, order, link destinations and accessible labels are preserved.

Birthday unit tests (11), ESLint and the production build passed. No application JavaScript errors observed; the existing external AdSense data-nscript warning remains. Evidence is in `audit/top-birthday-decoration-2026-10-05/qa.md`, `metrics.json` and the captured screenshots. Final result: passed within the local verification scope; no production deployment.

## Follow-up: Instagram and About order — 2026-10-05

Moved Instagram before the About card as requested. Removed the embed section's former preceding separator/spacing and added a 40px gap before About. Public post URLs, embed behavior and About content are preserved.

Verified the heading order and both loaded embeds at 1280px, and the single mobile embed at 375px. About follows Instagram with a 40px gap and no horizontal overflow at both sizes. ESLint, production build and diff whitespace checks passed. No application JavaScript errors observed; the existing external AdSense data-nscript warning remains. Evidence: `audit/top-section-order-2026-10-05/metrics.json`, `01-mobile.png` and `02-desktop.png`. Local preview updated; no commit, push or production deployment.

## Follow-up: excessive space below About — 2026-10-05

The previous order-change QA did not flag the compounded 184px mobile gap between About and the footer. Reduced it to 24px on TOP, moved the mobile navigation allowance below footer content, and preserved other pages' spacing. Verified 375px and 1280px without horizontal overflow, copyright clear of the fixed navigation, and unchanged /about layout styles. ESLint and production build passed. The existing external AdSense warning remains. Evidence and limits: `audit/top-bottom-spacing-2026-10-05/qa.md`. Local preview updated; no production deployment.

## Follow-up: intro typography — 2026-10-05

Reduced the TOP introduction from 13px to 12px on mobile and from 15px to 13px on desktop. Changed medium weight to regular, tightened mobile line-height from 24px to 20px, balanced wrapping, widened the desktop copy area, and added a very pale blush background with a subtle lower border. Protected the guide and unofficial-site phrases from splitting after the first visual pass. The text and heading structure are preserved.

Verified 375px, the normal 462px preview and 1280px: no horizontal overflow, two mobile lines, one desktop line. The normal mobile band shrinks from 64px to about 57px. ESLint and production build passed; no application JavaScript errors observed. The existing external AdSense warning remains. Evidence: `audit/top-intro-refinement-2026-10-05/metrics.json` and screenshots. `intro-refined.png` is a proportional crop of the normal preview including the header and next section's date. Local preview updated; no production deployment.

## Follow-up: description beside the header logo — 2026-10-05

Moved the introduction into the shared public header as three lines with 10px mobile / 11px larger-screen text. Removed the separate TOP introduction and duplicate large logo, keeping the main H1 for assistive technology. Header height remains about 65px, and today's overview begins immediately below it. Verified mobile, tablet menu open/close, desktop navigation and the /about header. Lint and build passed; no application JavaScript errors observed. The existing AdSense warning and 320px Instagram minimum-width overflow remain outside this change. Evidence and measurements: `audit/header-intro-placement-2026-10-05/qa.md`. Local preview updated; no production deployment.

## Follow-up: two-line header and wider logo gap — 2026-10-05

Shortened the copy to two lines: "ハーモニーランドの予定と" / "来園ガイドの非公式サイト". Kept 10px mobile and 11px larger-screen fonts. Increased logo spacing from 12px to 24px on mobile and from 16px to 40px above 640px. Verified both lines fit at 320px, 375px, 462px and 1280px; header height stays about 65px. The five desktop navigation links remain clear. No document overflow at 375px, 462px or 1280px; the pre-existing 320px Instagram overflow remains. Build, lint and whitespace checks passed; no application JavaScript errors observed, with the existing external AdSense warning unchanged. Evidence: `audit/header-two-lines-2026-10-05/metrics.json` and screenshots. Local preview updated; no production deployment.

## Follow-up: desktop single line and mobile right alignment — 2026-10-05

At 1024px and above, the two phrases display inline on one 15px-high line, maintaining the 40px logo gap. Below that breakpoint, the two-line paragraph and its text align with the header's right content edge while retaining the minimum logo gap. Verified 320px, 375px, 768px, 1024px, 1280px and the normal 462px preview. Mobile paragraph right equals the content edge; desktop phrases share the same top coordinate. Header height remains about 65px, and desktop navigation is clear. Build and lint passed; no application JavaScript errors observed. The existing AdSense warning and 320px Instagram overflow remain unchanged. Evidence: `audit/header-responsive-intro-2026-10-05/metrics.json` and screenshots. The two exported header crops preserve their raster proportions and include the following overview date. Local preview updated; no production deployment.

## Follow-up: Rakuten PICK UP — 2026-10-06

Implemented the approved PICK UP layout after the guides and before Instagram: four selected products, two columns and two rows on mobile, four columns above 1024px. Added `/admin/rakuten-pr` with product search, editorial copy, selection, ordering, removal, visibility, independent placement saves and a live mobile preview. A registered-placement model, shared repository/API and reusable public component support adding other page locations later. The initial placement remains disabled until the editor selects and publishes four products.

Source: `drafts/rakuten-design-2026-10-06/pickup-four-products.png` (1536×1024 comparison board). Final built browser captures: `audit/rakuten-pr-2026-10-06/02-desktop-full.jpg` and `03-mobile-full.jpg`, with CSS viewports 1280×900 and 375×844. Side-by-side normalized crops: `06-desktop-comparison.png` and `07-mobile-comparison.png`. Compared the same PICK UP / four-card state; preserved raster proportions, compensated the IAB screenshot scaling and aligned crop starts to the visible headings. Real Rakuten API images replace the concept's sample photos. Existing site fonts, icons and background are preserved.

Verified 4 columns at 1280px and 2 aligned columns / 2 rows at 375px. All four API images loaded, and CTA height is 44px. At 320px, the PR section and its scrollWidth are both 320px; the existing Instagram page overflow remains outside this change. Corrected wrapping for long editor copy and made the compact admin preview use actual mobile type sizes. The darker CTA meets approximately 4.64:1 white-text contrast. API image resolution and reserved two-line copy height account for intentional visual differences.

Final lint, TypeScript and isolated production build passed. All 30 Rakuten integration tests passed, and the broader related check passed 35 tests. A real, read-only Rakuten request returned 12 products with affiliate URLs. The production-built local app passed eight HTTP flow checks through actual Auth/Storage SDKs and admin routes: authentication, search, draft save/reload, notes/order preservation, disabled TOP, incomplete-publication rejection, four sponsored TOP links and protected manager rendering, unregistered placement and foreign-origin rejection. Production data was not written.

No application JavaScript errors observed in the public preview; the existing external AdSense data-nscript warning remains. Browser clicks on the login form and ordinary links were unresponsive in the selected browser, which already had a prior dialog-control problem. Therefore browser-driven admin selection/save is explicitly unverified; the endpoint flow was verified separately. This is not reported as a completed browser form test. Full evidence, limitations and source comparison are in `audit/rakuten-pr-2026-10-06/qa-report.md`.

P0/P1/P2: no implementation issue remains in the visual and endpoint verification scope. P3: real product photography, inherited section spacing and the existing external warning. final result: passed — for the local public design and authenticated API integration scope, excluding browser-click completion and production publication. Local QA preview remains running; no deployment or new commit/push was performed.

## Follow-up: Rakuten whole-card links — 2026-10-06

Removed the separate CTA as requested. The image, title, editorial note and card padding share one sponsored link; hover, pressed background and keyboard focus remain. Verified two columns / two rows at 375px and four columns at 1280px, with four loaded images and no separate CTA. A real browser card click opened a new tab on the Rakuten product page. The shared admin preview matches the public cards.

Completed the previously unverified browser manager flow in a fresh session: login, search, four-item selection, duplicate/fifth-item prevention, ordering, editorial notes, disabled save and hidden TOP, enabled save, reload persistence and four public links. Production data was not written. Final component lint and production build passed; the 30 Rakuten integration tests passed. Existing external AdSense warnings remain. Evidence and limits: `audit/rakuten-pr-card-tap-2026-10-06/qa.md`. final result: passed within the local public and admin browser verification scope.

## Follow-up: editable Rakuten banner — 2026-10-06

Placed the user-supplied 468×60 banner between latest articles and birthdays, centered with 24px vertical padding, a sponsored label and a whole-image link. Added a separate Banner tab to Rakuten PR management, with registered placements, code import, direct URL/alt editing, visibility, private storage and a shared preview. The requested initial banner is enabled by default; saved visibility settings are retained. Product selection and API credentials remain independent.

Verified actual image loading and placement at 375px, 320px and 1280px, plus the mobile admin form. Browser verification covered login, import, unsafe URL rejection, save, off/on publication, reload persistence and a real click opening the Rakuten campaign in a new tab. Rechecked import and persistence after making HTML parsing inert. All 42 Rakuten tests, full lint and production build passed. No application JavaScript errors observed; the existing AdSense warning and 320px Instagram overflow remain.

Evidence: `audit/rakuten-banner-2026-10-06/qa.md`, measurements, browser-flow results and screenshots. `08-mobile-placement.png` is a proportional crop of a scrolled viewport capture showing articles, banner and birthday clear of fixed navigation. Local Auth/Storage/content fixtures were used; no production data was written. Final result: passed within the local public and admin verification scope. Production deployment and production authenticated saves are not claimed.
