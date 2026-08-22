# Formal UI Design QA

## Visual truth and captures

- Source visual truth:
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\01-main-exploration-ui.png`
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\02-battle-ui.png`
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\03-spell-archive-ui.png`
- Browser-rendered implementation captures:
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-ui-qa\exploration-fresh.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-ui-qa\battle-active.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-ui-qa\archive-final.png`
- Full-view comparison evidence:
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-ui-qa\compare-exploration-final.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-ui-qa\compare-battle-final.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-ui-qa\compare-archive-final.png`

## Capture conditions

- CSS viewport: 1672 × 939.
- Source pixels: 1672 × 939 for each reference.
- Implementation pixels: 1672 × 939 for each desktop capture.
- Density normalization: source and implementation were captured at the same pixel dimensions; both sides were proportionally reduced to 836 × 469 only when composing each side-by-side comparison.
- States: fresh prologue exploration with three events; active PVE battle with both spell pages visible; spell archive with learned and locked entries.
- Focused-region comparison was not needed because all three source screens and their major UI regions fit completely inside the matched full viewport. The spell detail modal and mobile battle header were inspected separately as functional/responsive checks.

## Primary interactions tested

- Main navigation between exploration and spell archive.
- Six-school archive tabs, search filtering, spell-detail modal, modal close.
- Immediate PVE event entry, pause/resume, speed changes, single-step action, player and enemy page-cast animation states.
- Battle victory settlement and return to exploration.
- New-run confirmation and fresh prologue restoration.
- 390 × 844 responsive battle layout.
- Browser console was checked during exploration; no errors were reported. Automated HTML/module tests cover the remaining render graph.

## Comparison history

1. P2 — Icon glyphs were blank because only the Font Awesome weight sheet was loaded. Added the local Font Awesome base stylesheet and verified rendered icons in the browser.
2. P2 — The environmental background sat behind the document stacking context. Corrected the body/game-shell stacking order and re-captured all screens.
3. P2 — Archive cards used a nested button-like interaction model. Replaced it with a semantic dedicated detail button while retaining mouse access on the card surface.
4. P2 — The 390 px battle header wrapped the title into several lines. Changed the small-screen header to a two-row control layout and verified the mobile capture.
5. P2 — Locked archive entries lacked a readable state. Added a visible “尚未学习” label and increased readable effect-copy size.

Post-fix evidence is contained in the three `compare-*-final.png` files above.

## Final findings

- No actionable P0, P1, or P2 issues remain.
- P3: event and archive illustrations reuse the current production asset set, so their subject matter is more abstract than the concept paintings. The composition, hierarchy, graphite/brass palette, parchment treatment, symmetric battle stage, filtering, and core interaction model are preserved.
- Residual test gap: no dedicated screen-reader session was run; semantic snapshots and keyboard-capable native controls were inspected instead.

final result: passed
