# TOP lower spacing — 2026-10-05

The user's screenshot showed an excessive blank area after the About card. At the normal 462px preview width, the measured gap was 184px: section padding 40px, main padding 96px and footer margin 48px.

The TOP now leaves 24px after About. The home-about marker scopes the main/footer overrides to TOP. Its 96px mobile-navigation allowance is moved below footer content; desktop does not need that allowance. No client hooks or rendering logic were added.

- At 375px and 1280px, the measured card-to-footer gap is 24px with no horizontal overflow.
- The final copyright text clears the fixed mobile navigation by 32px at 375px.
- The /about page retains its former main padding (96px), footer margin (48px) and footer bottom padding (0px).
- ESLint, production build and whitespace checks passed.
- No application JavaScript errors observed. The existing external AdSense data-nscript warning remains.
- Local preview updated. No commit, push, deployment or production data write.

Evidence: user source `00-user-before.png`, measurements `metrics.json`, mobile and desktop screenshots, mobile page end `03-mobile-page-end.png`, and final normal-viewport capture `05-result.png`. Browser embeds changed height during loading; the captured mobile result and final result were taken after the visible embed settled. The 24px gap is preserved by normal document flow.
