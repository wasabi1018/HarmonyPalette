# Hotel catalog comparison layout - 2026-11-25

The selected comparison-list direction has been implemented and visually reviewed in a local production build. No production environment was changed.

## Visual truth and evidence

- Source: `source-selected.png`, the exact user-selected attachment, 591 x 1280 pixels.
- Implementation: `01-mobile-390.png` and `12-final-mobile.png`, 390 x 845 pixels/CSS pixels, deviceScaleFactor 1. Mobile emulation is enabled; there is no desktop scrollbar or development indicator.
- State: all six isolated fixtures, all areas, near order (`#sort=near`). The default order remains recommended.
- Full-view comparison: `comparison-final.png`, source normalized to 390 x 845 beside the 390 x 845 implementation.
- Focused first-row comparison: `comparison-detail.png`. Source and implementation card regions are aligned by the first row, so different intro heights do not obscure typography, image, time, or CTA differences.
- Other captures: 320px (`06-mobile-320.png`), tablet 768px (`07-tablet.png`), desktop 1280px (`08-desktop.png`), filters (`03-conditions-mobile.png`, `04-filtered-mobile.png`), recommendations (`05-editorial-picks.png`), and detail (`10-detail-desktop.png`, `11-detail-mobile.png`). Full pages are `02-mobile-full.png` and `09-desktop-full.png`.

## Comparison history and findings

1. First comparison (`comparison-first.png`): [P2] excessive intro/row spacing and a wrapped travel-time line materially reduced comparison density. Latin text also needed a clearer sans-serif face. First row was about 255px tall.
2. Fixes: reduced intro, recommendation and row spacing; tightened mobile travel-time caption; kept the time on one line at 390px; used Arial for Latin and Meiryo for Japanese; limited the recommendation to a brief excerpt with the full explanation on the detail page. At 320px the repeated destination caption is visually hidden while remaining available to assistive technology.
3. Revised comparison (`comparison-revised.png`) and final production capture (`comparison-final.png`, `comparison-detail.png`): first row is about 204px tall; time is on one line, CTAs align, and no actionable P0/P1/P2 findings remain within the existing product requirements.

## Required fidelity surfaces

- Typography: Japanese sans-serif with Arial Latin, 15px mobile hotel titles and 16px emphasized travel times. Hotel names remain fully visible and wrap naturally. Source-like hierarchy is preserved; generic hotel facts are not made into invented marketing text.
- Layout/rhythm: white horizontal comparison rows, fine separators, photo left, hotel information right, details and booking actions aligned beneath. Desktop uses photo/information/actions columns. Source normalization and same viewport/state are recorded above.
- Colors/tokens: white, existing ink, rose #b43e68 for time/booking, neutral fine borders. The old nested pink/cream card treatment is removed from the list. Selected filters have a visible rose treatment.
- Image quality: genuine existing Rakuten affiliate assets and site logo are reused. The source concept's synthesized or altered hotel photos are not substituted for real buildings. Existing 100px image material is a known low-resolution constraint, especially on desktop; licensed larger images are a P3 follow-up. Source and credit remain intact.
- Copy/content: approved hotel names, sourced travel times, explicit unknown times, existing recommendations, valid affiliate destinations, and clear disclosure. No invented price, availability, review, or hotel fact was added.

## Intentional product differences from the concept

- The existing site logo/navigation and genuine affiliate image material are preserved.
- Editorial recommendations remain available above the list as a collapsible section, adding a small row absent from the visual concept. They remain separate from paid PR.
- Booking targets are at least 44px tall, larger than the normalized mock. Combined with the editorial section, this makes the viewport less dense than the concept; this is an accepted accessibility/product constraint rather than an accidental regression. Full six-hotel captures are provided.
- Existing editorial text may be longer than the concept copy; excerpts use ellipsis and link to the full explanation. No database content is overwritten just to match the mock.

## Verification

- Browser: 19 checks passed on the production build at `http://127.0.0.1:3100`, with no JavaScript exceptions or console warnings/errors. Details in `browser-results.json`.
- Tested near sorting from URL, secure sponsored links, booking touch target size, conditions open/close and focus restoration, tag AND, area OR, empty recovery, sort retention, editorial expansion, 320/390/768/1280px overflow, selected narrow chips, detail navigation, and no catalog styling leakage into detail.
- Existing hotel model 4 tests and isolated PostgreSQL regression checks passed in the implementation turn. Production build, including lint and type validation, passed after the final CSS changes. List remains static and six detail routes remain SSG with one-day revalidation, about 115 kB first-load JS including shared code.
- The unavailable browser provider was replaced with a separate Chrome verification profile after the user requested screenshots in response to the permission question. No existing private Chrome window was read.
- No booking transaction or external affiliate click was performed. Production data, remote migrations, media uploads, publication and deployment were not changed.

## Follow-up polish

- P3: obtain licensed higher-resolution hotel images for sharper desktop previews.
- P3: if desired, further tune the mobile intro density while preserving the existing recommendation feature and accessible booking target size.

final result: passed
