# Guide card backgrounds without stars — 2026-10-07

The user requested birthday-card-style backgrounds for the three homepage guides, separate colors, removal of star decorations, and a commit/push. The user then selected the guide cards and required TOP changes as the commit scope.

## Implemented appearance

- First visit: pale pink gradient.
- Tickets / Harmony Pass: pale mint gradient.
- Parade viewing locations: pale lavender gradient.
- Rounded corners, a faint corner circle and a white circular arrow match the birthday strip's visual language. Guide cards contain no star decorations.
- The full card remains a link, with theme-colored keyboard focus and darker readable copy. The admin preview shares the same component.

## Evidence

`390-guide.png` and `1280-guide.png` are proportional crops of real production-preview screenshots. `metrics.json` records the three gradients, URLs, no card/page overflow and zero decorative SVGs at both viewport sizes. These captures used the complete working-tree preview; the scoped commit uses the same guide component. Unrelated PR sections are outside these crops and outside this commit.

The earlier guide pass checked the mint keyboard focus ring and the first whole-card link to the beginner guide series. Those historical captures remain in the working tree under `audit/guide-card-backgrounds-2026-10-07/`.

## Commit verification

Prepared a separate snapshot from HEAD `11c1885` plus the selected TOP files. Removed only the unrelated Rakuten PR/banner imports, data fetches, props, rendered sections and admin navigation from the snapshot. The user's complete working files were preserved. The snapshot contains the TOP overview, two latest articles, birthday strip, existing schedule, editable guide cards and shared header/footer spacing.

- Isolated snapshot ESLint: passed.
- Guide validation, settings persistence/authorization/error handling, today status and birthday tests: 19 passed.
- Full working-tree production build: passed.
- Scoped snapshot production build and TypeScript checking: passed; all 32 static pages generated.

The scoped production build was also opened in a real browser at 390px and 1280px. Its gradients and links match, with zero decorative SVGs and no page/card overflow. `scoped-390-guide.png` shows the final committed component, and `scoped-metrics.json` records this check. No application JavaScript errors were observed; the existing external AdSense data-nscript warning remains.

The storage integration tests use an in-memory fixture; production settings were not written. Browser verification here covers the guide design. A new browser-driven admin-save flow is not claimed.

Unrelated Rakuten PR/banner/article, schedule-cache, draft, package and generated-file changes are excluded. Secrets, local environment files and attachments are excluded. Push is to the existing `codex/instagram-crowd-calendar` branch; production deployment is not part of this verification.
