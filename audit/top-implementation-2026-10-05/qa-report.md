
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
