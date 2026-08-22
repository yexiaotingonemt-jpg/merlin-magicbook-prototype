# Formal UI Design QA

## Visual truth and captures

- Source visual truth:
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\01-main-exploration-ui.png`
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\02-battle-ui.png`
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\03-spell-archive-ui.png`
- Browser-rendered implementation captures:
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\exploration-1672x939.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\battle-1672x939.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\grimoire-1672x939.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\archive-1672x939.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\shop-1672x939.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\exploration-390x844.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\battle-390x844.png`
- Full-view comparison evidence:
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\compare-exploration.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\compare-battle.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-viewport-fit-qa\compare-archive.png`

## Capture conditions

- CSS viewport: 1672 × 939.
- Source pixels: 1672 × 939 for each reference.
- Implementation pixels: 1672 × 939 for each desktop capture.
- Density normalization: source and implementation were captured at the same pixel dimensions; both sides were proportionally reduced to 836 × 469 only when composing each side-by-side comparison.
- States: fresh prologue exploration with three events; active PVE battle with both spell pages and battle log visible; complete 10-page binding desk; spell archive with learned and locked entries; shop inventory.
- Responsive evidence: 390 × 844 exploration and battle captures. The mobile layout intentionally becomes vertically scrollable while preserving a viewport-fixed bottom navigation.
- Focused-region comparison was not needed because the complete information architecture and all major controls are readable in the full 1672 × 939 captures. Internal list scrollbars were inspected directly in the binding desk, archive, and battle log.

## Primary interactions tested

- Main navigation between exploration and spell archive.
- Six-school archive tabs, search filtering, spell-detail modal, modal close.
- Immediate PVE event entry, pause/resume, speed changes, single-step action, player and enemy page-cast animation states.
- Battle victory settlement and return to exploration.
- New-run confirmation and fresh prologue restoration.
- 1672 × 939 page-scroll elimination across exploration, battle, binding desk, archive, and shop; long collections remain available through panel-local scrolling.
- 390 × 844 responsive exploration and battle layouts, including the fixed bottom navigation.
- Browser console was checked after desktop and mobile interaction passes; no errors or warnings were reported. Automated HTML/module tests cover the remaining render graph.

## Comparison history

1. P2 — Icon glyphs were blank because only the Font Awesome weight sheet was loaded. Added the local Font Awesome base stylesheet and verified rendered icons in the browser.
2. P2 — The environmental background sat behind the document stacking context. Corrected the body/game-shell stacking order and re-captured all screens.
3. P2 — Archive cards used a nested button-like interaction model. Replaced it with a semantic dedicated detail button while retaining mouse access on the card surface.
4. P2 — The 390 px battle header wrapped the title into several lines. Changed the small-screen header to a two-row control layout and verified the mobile capture.
5. P2 — Locked archive entries lacked a readable state. Added a visible “尚未学习” label and increased readable effect-copy size.
6. P2 — The desktop experience required page scrolling to reach the battle record, lower status cards, and long collections. Added a 1672 × 939 viewport-fit layout, moved the battle record into the central combat stage, and confined long lists to panel-local scrolling.
7. P2 — The first compact binding-desk pass hid its filter row because the grid declared only three tracks for four children. Added an explicit filter track and re-captured the complete screen.
8. P2 — The mobile bottom navigation rendered inside the sticky header because the header backdrop filter created a fixed-position containing block. Disabled that filter at the mobile breakpoint and verified the navigation at the viewport bottom.

Post-fix evidence is contained in the three `compare-*-final.png` files above.

## Final findings

- No actionable P0, P1, or P2 issues remain.
- P3: compared with the original concept paintings, the 1672 × 939 implementation deliberately uses denser typography and shallower imagery to satisfy the new single-viewport requirement. The graphite/brass palette, parchment treatment, symmetric battle stage, filtering, and core interaction model remain consistent.
- Residual test gap: no dedicated screen-reader session was run; semantic snapshots and keyboard-capable native controls were inspected instead.

final result: passed
