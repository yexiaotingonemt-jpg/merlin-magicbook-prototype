# Design QA

## Comparison Target

- Source visual truth:
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\01-main-exploration-ui.png`
  - `C:\Users\onemt\Documents\KC策划案撰写和检查\outputs\merlin-formal-ui-concepts-v2-20260822\02-battle-ui.png`
- Browser-rendered implementation:
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-qa\06-exploration-final.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-qa\03-battle-readable.png`
- Local route: `http://127.0.0.1:4173/game.html`
- Viewport: 1672×939 CSS pixels, device density 1.
- Pixel normalization: source and implementation captures are both 1672×939, so no resampling was required.
- State:
  - Exploration source is Chapter 1 with three choices; implementation is the prologue with three choices. Event names differ, but the card count, layout and decision hierarchy are directly comparable.
  - Battle source is an active turn; implementation is a completed PVE turn. The central book, left/right combatant panels, page content and combat log remain directly comparable.

## Full-view Comparison Evidence

- Exploration: all three event cards now use readable 3:2 narrative scenes instead of elemental color textures. Card proportions, scene-first hierarchy, timer position and right-side character panel follow the selected source.
- Battle: the center is now one connected physical open grimoire with a spine, page thickness, cover and bookmarks. Dynamic player and enemy content is embedded into the left and right page safe areas.
- Desktop fit: both primary screens remain fully visible at the requested 1672×939 viewport.

## Focused-region Comparison Evidence

- Event art was inspected individually at 960×640 after WebP conversion to verify subject clarity, crop safety and compression quality.
- The grimoire asset was inspected at 1536×1024, then rechecked in the rendered battle screen to verify the gutter, page edges, writing safe areas and dynamic content alignment.
- Responsive captures:
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-qa\04-battle-1280.png`
  - `C:\Users\onemt\AppData\Local\Temp\merlin-formal-qa\05-battle-760.png`

## Required Fidelity Surfaces

- Fonts and typography: display headings retain the Song/Georgia fantasy hierarchy. Battle page body text was increased after the first render and remains readable without overflowing the page regions.
- Spacing and layout rhythm: event art and copy use a clear image/content split. The open book uses symmetric left/right safe areas and a protected central gutter.
- Colors and visual tokens: charcoal, aged bronze, warm parchment and restrained candlelight match the source direction. Semantic danger, victory and defeat colors remain intact.
- Image quality and asset fidelity: ten generated production assets replace the former abstract textures and standalone parchment cards. Assets are WebP and retain enough resolution for the maximum displayed size.
- Copy and content: all text remains live DOM content sourced from the current game state; no gameplay text is baked into the generated images.
- Icons: existing Font Awesome controls remain functional and sit above the new scene art without replacing the art itself.
- Accessibility and motion: event choices remain semantic buttons, focus styling remains visible, page animations preserve the existing reduced-motion behavior, and narrow layouts remain scrollable.

## Comparison History

### Iteration 1

- [P1] Event cards used four abstract texture files, producing near-solid color blocks.
  - Fix: generated and mapped nine event-family narrative scene illustrations.
  - Post-fix evidence: `06-exploration-final.png`.
- [P1] Battle center remained two independent rectangular cards.
  - Fix: generated a coherent open-book asset and rebuilt the two dynamic panels as left/right page regions inside one shared book.
  - Post-fix evidence: `02-battle.png`.

### Iteration 2

- [P2] Battle page copy was too small and low-contrast at 1672×939.
  - Fix: increased page header, title, metadata and effect text sizes and strengthened parchment ink contrast.
  - Post-fix evidence: `03-battle-readable.png`.

## Findings

- No actionable P0, P1 or P2 visual mismatches remain for the requested event-art and open-grimoire replacement scope.

## Follow-up Polish

- [P3] The source mockup uses slightly larger ornamental display typography and more decorative outer frames. The implementation intentionally keeps its denser live rule text and existing full-game navigation.
- [P3] Tablet layouts are scroll-first rather than single-screen; the requested 1672×939 desktop viewport remains the primary single-screen target.

## Verification

- Primary interactions tested: restart tower, confirm restart, select Element Trial, run PVE battle, display result, confirm result and return to exploration.
- Browser console errors and warnings: none.
- Automated suite: 47/47 passed.

final result: passed
