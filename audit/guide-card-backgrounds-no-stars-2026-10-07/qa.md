# Guide card backgrounds: master integration — 2026-10-08

Updated the three homepage guides to pink, mint and lavender gradients, with faint corner circles and white circular arrows. Guide cards contain no star decorations. The shared admin preview uses the same component.

The user requested pushing this change to master. The master base was b28ac74, which already contained the editable TOP and Rakuten features. Applied the approved guide component from bed59ea to that base without merging the older feature branch or changing other application files.

## Evidence and checks

- `390-guide.png`, `1280-guide.png` and `metrics.json` record the previous complete working-tree production preview: separate gradients, safe link destinations, no page/card overflow and zero decorative SVGs.
- `scoped-390-guide.png` and `scoped-metrics.json` record the previously verified guide component in an isolated production build at 390px and 1280px.
- The master worktree's component is identical to the approved bed59ea component. No shared CSS or surrounding layout change is included.
- Guide validation and settings persistence/authorization/error handling tests: 5 passed on the master worktree.
- Master worktree lint, TypeScript checking and production build: passed; all 32 static pages generated. The initial restricted runs were stopped after prolonged execution and the final checks completed successfully with authorized elevated permissions.

Production settings were not written. New browser-driven admin saves and production deployment are not claimed. The previous browser console had no application JavaScript errors; the existing external AdSense data-nscript warning remains.
