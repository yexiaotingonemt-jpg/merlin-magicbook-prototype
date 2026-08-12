# Design QA

## Source reference

- Screenshot: `C:\Users\onemt\AppData\Local\Temp\codex-clipboard-1d9fc2fe-b84b-4311-a89e-e7710fff1463.png`
- Source viewport: 1920 x 920 px
- Interpreted annotation: move the bottom-left ranking/projection panel into the empty area beneath the settlement record and align it with the left content column.

## Implementation evidence

- Preview: `https://social-dock-layout.merlin-magicbook-yexiaoting.pages.dev/?v=6952f92`
- Screenshot: `C:\Users\onemt\AppData\Local\Temp\merlin-social-dock-layout-6952f92.jpg`
- Captured viewport: 1920 x 911 px
- Captured state: logged-in Chapter 1 game, leaderboard tab visible.
- Desktop geometry: panel `left=362`, `top=564.8`, `width=330`, aligned with the main left column and positioned directly beneath the settlement record.
- Mobile verification: 390 x 844 px, panel remains bottom-docked at 8 px on both sides; horizontal overflow is 0 px.

## Findings

- Pass: the panel no longer touches the viewport edge on desktop.
- Pass: the panel is visually grouped with the left-side game controls and occupies the annotated empty area.
- Pass: ranking and cross-player projection tabs remain interactive.
- Pass: the responsive mobile behavior is preserved without horizontal overflow.
- No blocking visual mismatches found for the requested relocation.

## Iteration history

1. Replaced fixed bottom-left positioning with container-aligned desktop positioning.
2. Added a short-height desktop fallback so the panel remains reachable on smaller displays.
3. Preserved the existing mobile bottom-dock behavior.
