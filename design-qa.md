# Design QA: 時間軸とカード余白

## Evidence

- Source visual truth: `C:/Users/mkcs1/AppData/Local/Temp/codex-clipboard-4c08fa2c-1f13-41ad-9dc9-d85a9afe8fde.png`
- Desktop implementation: `C:/Harmony Palette/audit/37-schedule-axis-spacing-fixed-desktop.png`
- Mobile implementation: `C:/Harmony Palette/audit/36-schedule-axis-spacing-fixed-mobile.png`
- Combined focused comparison: `C:/Harmony Palette/audit/38-schedule-axis-spacing-comparison.png`
- Source pixels: 1128 × 483, PNG, 120 dpi.
- Desktop browser viewport: 1128 × 520 CSS pixels.
- Desktop capture: 1113 × 513 pixels. The in-app browser excluded its scrollbar/chrome from the captured content.
- Mobile browser viewport: 390 × 844 CSS pixels.
- Mobile capture: 375 × 811 pixels.
- State: 2026-07-26 schedule, light theme.

## Findings

No unresolved P0, P1, or P2 findings.

The supplied screenshot showed two spacing problems:

1. Horizontal start-time lines continued beneath the time labels.
2. Cards started directly on the horizontal line while only their lower edge had row spacing.

Both issues are visibly resolved in the combined comparison.

## Fixes and measured verification

- Horizontal lines now start at grid column 2, immediately to the right of the time-axis column.
- Desktop: the 10:00 label ends at x=125 and the line begins at x=138, leaving 13 px of clear space.
- Mobile: the 10:00 label ends at x=69 and the line begins at x=78, leaving 9 px of clear space.
- Event and Fan Studio cells now use equal vertical padding.
- Desktop first-row card spacing: 16 px above and 16 px below.
- Mobile first-row card spacing: 12 px above and 12 px below.

## Required fidelity surfaces

- Fonts and typography: unchanged; time labels remain legible and no longer have a line running behind them.
- Spacing and layout rhythm: corrected with equal top/bottom card padding and a line origin after the time column.
- Colors and visual tokens: existing pink solid/dashed line tokens are preserved.
- Image quality and asset fidelity: no image or raster asset changes were needed.
- Copy and content: unchanged.

## Interaction and browser checks

- Schedule data loaded successfully in the production build.
- Existing add/remove interaction remained available.
- Browser console warnings/errors: none.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Comparison history

1. Initial P2: horizontal lines overlapped the time labels.
   - Fix: changed the line grid span from columns `1 / -1` to `2 / -1`.
   - Post-fix evidence: `audit/38-schedule-axis-spacing-comparison.png`.
2. Initial P2: card tops touched their start-time lines.
   - Fix: changed row-cell padding from bottom-only to equal vertical padding.
   - Post-fix evidence: desktop 16 px/16 px and mobile 12 px/12 px measured spacing.

## Follow-up polish

No additional spacing polish is required for this correction.

## Final result

final result: passed
