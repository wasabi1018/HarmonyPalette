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

## Follow-up: guide card backgrounds without stars — 2026-10-07

Restyled the three TOP guides with the birthday strip's pale gradients and corner circles. The cards use pink, mint and lavender in order, with white circular arrows and matching darker accents. Removed the guide cards' star decorations at the user's request. Description text uses 80% ink; the shared admin preview uses the same component.

Verified star-free cards at 390px and 1280px in the production-built local app, with zero decorative SVGs and no card or page overflow. The earlier guide pass also checked keyboard focus and whole-card navigation. Related guide/settings/status/birthday tests passed (19), and lint passed in an isolated HEAD-plus-TOP snapshot prepared for the requested commit. The scoped production build and TypeScript check passed; the resulting app also passed 390px/1280px guide checks with no application JavaScript errors. The existing external AdSense warning remains.

The user selected guide cards and the TOP changes needed to make this uncommitted homepage feature usable. The commit includes the homepage layout and settings dependencies. Unrelated Rakuten PR/banner/article, schedule-cache, draft, dependency and asset changes remain outside this commit. Evidence and verification limits: `audit/guide-card-backgrounds-no-stars-2026-10-07/qa.md`. No production data was written.

## Follow-up: crowd calendar daily information — 2026-10-11

Added seasonal event start/end markers, editable labels (default: ファンスタ3部屋), published room counting, closing-time based night markers, registered birthdays and optional daily notes to the existing Instagram calendar. The editor has separate crowd-painting and daily-information modes, with shared event/label settings and monthly annotations. Condensed the heading/legend and expanded the grid while retaining the 1080×1350px output and crowd colors. Overflowing text reports its date and blocks image export instead of clipping silently.

Verified five simultaneous short entries in a six-week month, five-week months, editable label persistence, unsaved session restoration, note saving, closed-day birthdays/notes, the 17:00/17:30 boundary, and actual PNG output. At 1280px, 390px and 320px there was no horizontal document overflow or application console error. Thirteen focused domain/API/Storage tests, source lint excluding existing temporary generated files, TypeScript and production build passed. Direct production Storage persistence was not tested; browser QA used fictitious data with a local API. No deployment or production data change. Evidence: `audit/crowd-calendar-details-2026-10-11/qa.md` and `six-weeks-export.png`.

The requested October sample uses a read-only snapshot of published/verified Supabase records and registered birthdays. Saved crowd overrides and common settings were absent, so open days retain the initial normal level and no seasonal event or daily note is invented. The actual 1080×1350px PNG is in `output/instagram/crowd-calendar-2026-10/`. Before commit, an isolated HEAD-plus-calendar snapshot passed all 13 focused tests, full lint and the production build including type validation without production environment variables. Unrelated working changes are excluded.

## 混雑予想ページ（2026-10-18）

- source visual truth: `output/crowd-forecast-design-2026-10-18/desktop-selected.png`（1422×1106）、`mobile-weather-v3.png`（826×1905）。
- implementation: `audit/crowd-forecast-2026-10-18/desktop-top-final.png`（1440×1100 CSS px・等倍）、`mobile-modal-final.png`（390×899、390×900 CSS px・等倍）。
- full-view comparison: `audit/crowd-forecast-2026-10-18/desktop-comparison-final.png`、`mobile-comparison-final.png`。PCは双方700px幅へ比例縮小、モバイルは390×900へ密度正規化して同じ比較画像内で確認。
- focused comparison: モバイル比較の下部シートで、日付、混雑度・天気の横並び、気温、時間帯別降水確率、営業情報、スケジュールへの導線を確認。PCの本文・カレンダーと右側パネルは元の等倍画像でも確認。
- state: PC初回18日選択、個別操作では19日選択を確認。ユーザー確認用の最終キャプチャは23日選択。スマホは19日のモーダル。気象庁の実XMLを使うテスト用データのため、見本の晴れ・24/17℃とは異なる。スケジュールは検証用。末日のスクロール、10月・11月の切り替え、未公開日の基本予想も確認。
- fonts/typography: サイト既存の和文フォントを継承。PC見出し38px、日付21px、PCトピックス11pxへ調整。モバイルは見出し26px、日付セル15px。点数・係数は公開しない。
- spacing/layout: PCはカレンダー＋右詳細、スマホは下からのモーダル。見本にあった二重の月見出しは1つに統合。未公開の案内を上部へ集約する最新仕様を優先し、PCでもカレンダーの開始位置が下がる。既存ヘッダー・フッターを維持。
- colors/tokens: ミント・ブルー・クリーム・アンバー・ローズの5色、休園の斜線。上部案内は淡いピンクと線画の丸囲み感嘆符。絵文字は使わない。
- image quality/assets: 既存 `/logo-compact.png` を使用。見本の仮ロゴをHTMLで再現しない。天気・注意・操作アイコンは既存Lucideの線画。
- copy/content: 数式・点数を公開文へ出さず概要のみ。地域・気温地点・気象庁の発表日時、6時間単位と日単位の降水確率を区別。未公開の予定は基本予想に未反映と明記。
- iteration history: 初回 `mobile-comparison-before.png` で、天気と混雑度が別行になってシートが高い[P2]を確認。横並びへ変更、余白と数値の行高を調整し `mobile-comparison-final.png` で再確認。Tab末尾から先頭への循環も明示実装して再検証。
- interactions: 月切替、スマホの日付モーダル、閉じる・背景タップ・Esc、Tab循環、背景スクロール固定と元の日付へのフォーカス復帰。管理画面の25→26の変更、プレビュー、保存、再取得。1日スケジュールの天気・気温・降水確率表示。
- responsiveness: 1440px・1024px・390pxで文書の横幅がビューポートを超えないことを確認。1024pxでは右詳細、390pxではモーダル。
- console errors: 新機能のブラウザー検証でerror/warnなし。最初のプレビュー接続失敗はローカルサーバーの実行制限によるもので、非公開のローカル検証サーバーを再起動して解消。現在はHidden常駐プロセスでユーザーの確認用に起動。
- verification: lint・production build・22件の計算/API/実SQLテスト成功。本番DBへの適用・デプロイは未実施。
- accepted differences: サイト既存ロゴ・ヘッダー、上部の公開状況、実XMLの天気、地域・地点・出典の追加に伴うシート高、検証用の日別混雑色。すべて表示仕様・データに由来する差として区別した。
- commit verification: HEAD＋今回の混雑予想差分だけを取り出した独立コピーでも、22件のテスト・lint・production build（型検証を含む）が成功。本番資格情報は使用せず、別作業の変更はコミットから除外。
- browser annotation follow-up: 見出しとページタイトルを「混雑予想」に変更。最終更新日時をカレンダー枠内の右下へ移し、毎日19時の更新案内は上部に保持。スケジュールの「混雑カレンダー」は線画アイコン付きのボタン表示とし、44pxの押下領域・hover・focus表示を追加。
- follow-up evidence: `audit/crowd-forecast-2026-10-18/calendar-updated-at-mobile.jpg`、`calendar-updated-at-desktop.jpg`、`daily-calendar-button-mobile.jpg`、`daily-calendar-button-desktop.jpg`。スマホの実表示（394px幅）とPC（1440px幅）で、更新日時が枠内の右下に収まり、横スクロールが生じないことを確認。ボタンから混雑予想への遷移、ブラウザーerror/warnなし、変更対象lint・独立コピーのproduction build成功。最初のdevページ再読込で一時的な404を検出し、再読込後の正常表示を確認。
- score follow-up: 100点の上限を廃止し、管理表で保存済みの丸め前の値も利用。ローカルの10/31が「110」、10/10・10/11が「103」と表示されることを確認（`audit/crowd-forecast-2026-10-18/admin-score-over-100-mobile.jpg`）。「上限前」列は「丸め前」に改称。過去日の保存値は変更せず、公開DTOには点数を含めない。回帰テストを含む24件・対象lint・独立コピーのproduction build成功。ブラウザーerror/warnなし。
- birthday selector follow-up（旧表示）: 誕生日タブの検索入力を廃止し、台帳順のキャラクター選択と、選択したキャラクターの誕生日・加点を表示。スマホ422pxとPC1440pxで44px高のセレクト・横幅を確認。5点への変更後に別タブへ移動して戻っても入力が保持され、確認後は元の10点へ戻した（保存操作なし）。`audit/crowd-forecast-2026-10-18/birthday-character-select-mobile.jpg`、`birthday-character-select-desktop.jpg`。対象lint・独立コピーのproduction build成功、ブラウザーerror/warnなし。ローカルの台帳はクロミ1件のため、複数キャラクターの切替と台帳0件の状態は実画面未確認。
- birthday list follow-up（現表示）: 全キャラクターの名前・誕生日を一覧に並べ、各行の右側に個別の点数セレクトを配置。キャラクター選択用プルダウンと検索入力は表示しない。スマホ422pxで1列、PC1440pxで2列・横幅超過なしを確認。ローカル台帳1件に対して一覧1行・点数セレクト1個を確認し、5点への変更とタブ移動後の保持を検証後、元の10点へ戻した（保存なし）。`audit/crowd-forecast-2026-10-18/birthday-points-list-mobile.jpg`、`birthday-points-list-desktop.jpg`。対象lint・独立コピーのproduction build成功、ブラウザーerror/warnなし。複数行・台帳0件の実画面確認は未実施。
- calendar topics follow-up: 表記を「ファンスタ3部屋」「ナイト営業日」「クロミ誕生日」に統一し、月・ケーキはインスタ用カレンダーと同じLucide Moon・CakeSliceを使用。旧スナップショットの「〜のお誕生日」は表示時だけ整形。日付マスを幅のコンテナとし、各項目の文字数とアイコン幅に応じた文字サイズで1行表示。320/390/1440pxで10/31の3項目すべてが1行かつ全文表示になることをDOM Rangeで確認。スマホの文字サイズは320pxで約3.7〜4.0px、390pxで約4.9〜5.3pxとなる。`audit/crowd-forecast-2026-10-18/calendar-topics-mobile.jpg`、`calendar-topics-desktop.jpg`。対象lint・独立コピーのproduction build成功、ブラウザーerror/warnなし。
- selected-day topics follow-up: 詳細の「ファンスタ予定／公開済み」を「この日のトピックス」に変更。カレンダーと詳細で同じトピックス生成処理・ラベルを使う。10/25はファンスタ3部屋・月付きナイト営業日、10/31はケーキ付きクロミ誕生日を含む3項目を確認。10/19は対象がないため欄を省くことを確認。PC右詳細とスマホモーダルで表示、文言・順序・アイコンの一致を確認（`audit/crowd-forecast-2026-10-18/daily-topics-mobile.jpg`、`daily-topics-birthday-modal.jpg`、`daily-topics-desktop.jpg`）。対象lint・独立コピーのproduction build成功、ブラウザーerror/warnなし。
- compact modal follow-up: スマホモーダルの余白・文字サイズを調整し、降水確率の時間帯と値、営業時間の見出しと値、トピックスを横並びに変更。日付と重複する「選択した日」はモーダル内だけ省く。346×668pxの10/18で内容高613→397px（約35%減）となり内部スクロールなし。320×568pxで10/18・10/25は397px、天気対象外・誕生日を含む10/31は338pxで横幅超過なし。閉じる・スケジュールボタンは44px高を保持し、Escでの閉じる操作・元の日付へのフォーカス復帰も確認。390×844pxでも397px、PC1440pxでは右詳細の日付24px・混雑色35pxを保持。`audit/crowd-forecast-2026-10-18/compact-day-modal-mobile.jpg`、`compact-day-modal-320.jpg`、`compact-day-modal-390.jpg`、`compact-day-modal-desktop-check.jpg`。独立コピーの全体lint・production build成功、ブラウザーerror/warnなし。
- date colors follow-up: 日付の数字だけ土曜を青（#245b9c）、日曜・祝日を赤（#b1233d）に変更。祝日を優先し、混雑予想と同じ保存済み祝日データを公開月の範囲で受け渡す。10/12・11/3・11/23の祝日、10/17・11/7の土曜、10/18・11/8の日曜、10/16の通常平日をcomputed styleで照合。トピックスは元の文字色を維持。スマホ・PC1440pxと月切替を確認（`audit/crowd-forecast-2026-10-18/calendar-date-colors-mobile.jpg`、`calendar-date-colors-desktop.jpg`）。公開範囲・予想未作成時の祝日データを含む25件のテスト、対象lint、独立コピーのproduction build成功。ブラウザーerror/warnなし。
- legend badges follow-up: 凡例を淡い背景と白い角丸バッジに整え、色見本をスマホ12px・PC14pxへ縮小。6つの文言・混雑色・休園斜線は保持。スマホは3列2段、PCは6列1段とし、320/390/1024/1440pxで全ラベルが1行・文字欠けなし・ページの横幅超過なしを確認。`audit/crowd-forecast-2026-10-18/calendar-legend-badges-mobile.jpg`、`calendar-legend-badges-desktop.jpg`。独立コピーの全体lint・production build成功、ブラウザーerror/warnなし。
- legend frame follow-up: 凡例全体の外枠・背景・内側余白を削除し、個別の角丸バッジのみ配置。スマホとPC1440pxで外枠0px・背景透明を確認し、6つのラベルとバッジの枠を保持。`audit/crowd-forecast-2026-10-18/calendar-legend-no-frame-mobile.jpg`、`calendar-legend-no-frame-desktop.jpg`。独立コピーの全体lint・production build成功、ブラウザーerror/warnなし。
- compact legend follow-up: 個別ラベルの枠・背景・影・内側余白・最小高さも撤去。文字はスマホ9px／PC10px、色見本は10px／11pxへ縮小し、行間を4pxに調整。320px・363pxのスマホで3列2段・高さ約29px、PC1440pxでは6列1段・高さ14pxとなり、全6ラベルの文字欠け・ページの横幅超過なし。`audit/crowd-forecast-2026-10-18/calendar-legend-compact-mobile.jpg`、`calendar-legend-compact-desktop.jpg`。独立コピーの全体lint・production build成功、ブラウザーerror/warnなし。
- legend alignment follow-up: 各ラベルをグリッド列の左端へ揃えるよう変更。スマホ363pxで上下の色見本の開始位置が各列で一致し、PC1440pxでも各列の左端に一致することを確認。凡例高はスマホ約29px・PC14pxを維持し、全ラベルの文字欠けなし。`audit/crowd-forecast-2026-10-18/calendar-legend-aligned-mobile.jpg`、`calendar-legend-aligned-desktop.jpg`。ブラウザーerror/warnなし。
- publication date ranges follow-up: 公開状況の日付整形を共通関数へまとめ、連続日は「10/27～10/31」、非連続は「10/26～10/27、10/30～10/31」とする全角の期間表記に統一。単日・空配列・連続日・非連続日・月跨ぎ・順不同と重複の6ケースを実行確認。スマホ363pxとPC1440pxで案内の表示と文字欠けなしを確認し、ブラウザーerror/warnなし。現在のローカルfixtureは未公開日が各1日のため、複数日の実画面は未確認（既存fixtureと保存済み設定を維持）。`audit/crowd-forecast-2026-10-18/publication-date-ranges-mobile.jpg`、`publication-date-ranges-desktop.jpg`。
- update note placement follow-up: 「翌日以降の予想を毎日19時ごろに更新します。」をヘッダーから下部「混雑予想について」の先頭段落へ移動。更新遅延がある場合のstatus表示は上部に保持。スマホ363px・PC1440pxで案内が下部だけに1件表示され、横幅超過なしを確認。`audit/crowd-forecast-2026-10-18/update-note-about-mobile.jpg`、`update-note-about-desktop.jpg`。ブラウザーerror/warnなし。
- refinement commit verification: 今回の混雑予想の実装ファイルが、独立コピーで全体lint・production buildを通過した内容と一致することを確認。独立コピーの計算・API・実SQLテスト25件も再実行し成功。共有QA文書は混雑予想の節だけをコミット対象とし、ほかの作業の変更を保持。
- final result: passed

## Instagram混雑予想画像の公開カレンダー統合（2026-10-18）

- source visual truth: ユーザーが指定した現在の `/crowd-forecast`。5段階の混雑色、休園斜線、日付色、線画の天気・月・ケーキ、枠なしで左揃えの凡例、上部の未公開案内を基準とする。
- implementation: `audit/crowd-forecast-2026-10-18/instagram-forecast-export-2026-10.png`（ブラウザーの「PNGを保存」で出力した実PNG、1080×1350px）。管理画面は `instagram-generator-mobile.jpg`、`instagram-generator-desktop.jpg`。
- shared rendering: 公開ページ・画像で `month.tsx` と `presentation.ts` を共用。10月31日分について日付・祝日名・混雑度・天気のラベルと混雑色が一致することをDOMで照合し、保存済みの予想を利用することを確認。生成・閲覧で外部天気の取得や予想の再計算は行わない。
- typography/layout: 画像は既存ロゴとYu Gothic／Meiryoを使い、固定サイズの専用余白・文字サイズで出力。凡例は6列、日付は7列、月の週数に応じて行高を配分。スマホ幅でも画像内部の幅1080px・高さ1350pxを保ち、プレビューのみ縮小する。本文の点数・係数・非公開メモは出力しない。
- states/interactions: 10月→11月→10月の選択、月切替で古いPNGの保存リンクを非表示にすること、画像生成・生成結果表示・実ファイル保存を確認。旧手塗り・下書きUIと旧保存APIを撤去し、旧2エンドポイントのPUTが404であることも確認。Supabase上の過去データや出力画像は削除しない。
- responsiveness: 363pxと1440pxでページの横幅超過なし、スマホから生成したPNGの自然寸法も1080×1350px。画像内の全日付セルで文字の縦横超過なし。共通化後の公開カレンダーも誕生日モーダル、Esc、前後月の切替を確認（`public-calendar-after-image-refactor-mobile.jpg`）。
- verification: 計算・API・実SQLの27件、独立コピーの全体lint・production build成功。React Best Practicesの観点で画像生成ライブラリの遅延読込、fetchのabort、ResizeObserverとBlob URLの後始末、月切替での生成結果の破棄、44px以上の操作領域を確認。復旧後に新しいタブで行った生成時のconsole error/warnなし。
- local preview: 既存の開発キャッシュに不整合が出たため、3018番のローカルプレビュー専用distDirへ分離。メモリ上の設定は保存・復元し、日本語をUTF-8で照合後、現在のpayloadが保存したローカル設定と一致することを確認。プレビューの再起動による本番データ変更はない。
- limitations: 6週の月・欠損日は純粋関数のテストで確認。6週の実PNG、予想が全くない月の管理画面、意図的に極端に長いトピックスを入れた生成エラーの実画面は未確認。実画像のデータはローカルfixtureであり、本番の正確な予想を示す証跡ではない。デプロイ・リモートStorage操作は未実施。
- final result: passed（上記未確認範囲を除く）
