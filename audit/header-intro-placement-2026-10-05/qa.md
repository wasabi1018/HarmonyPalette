# Header introduction placement — 2026-10-05

Moved the existing site introduction to the right of the compact logo in the shared public header. It has three phrase-based lines, 10px text below 640px and 11px text above. The standalone TOP introduction, including its duplicate large desktop logo, is removed. TOP keeps its single screen-reader H1 and starts with today's overview immediately below the header.

- Header height remains about 65px at 320px, 375px, 1024px, 1280px and the normal 462px preview.
- Header copy fits to the right of the logo at all tested widths. Only below 360px, logo width is reduced to 128px to give the copy enough room; the logo remains a 44px-high home link.
- At 375px, 1024px, 1280px and 462px, no document horizontal overflow. At 320px, the header fits but the document still measures 342px wide; the existing Instagram component retains its 326px minimum width. That provider layout is outside this header change.
- At 1280px, all five desktop navigation links remain visible and separated from the description.
- At 1024px, opened and closed the existing menu and verified aria-expanded returns to false.
- /about retains its page heading and displays the same shared header introduction. The logo home link returns to TOP.
- Production build, ESLint and diff whitespace checks passed. No application JavaScript errors observed; the existing external AdSense data-nscript warning remains.
- Existing Header hooks and client boundary are unchanged. HomeSections remains a server component; no new client dependencies or data fetching were added.
- Local preview updated. No commit, push, deployment or production data write.

Evidence: `metrics.json` and the screenshots in this directory. `00-before.png` is the previously verified normal preview. `logo-description.png` is a proportional crop from `05-current.png`, showing the header and following overview date.
