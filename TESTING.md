# Watt's Inside V2 — display QA

## Recommended checks

1. Open `index.html?kiosk=1&diagnostics=1`.
2. Press F11 and confirm the full 1920 × 1080 composition is visible.
3. Confirm the scene and right control card share the same lower baseline.
4. Switch through all three system types and every day/night scenario.
5. Confirm wires remain connected after resizing, entering F11, and leaving F11.
6. Confirm the control card never scrolls or clips a scenario button in kiosk mode.
7. Confirm the house, battery pair, ATS, distribution board, and inverter retain their proportions.

## Resolution matrix

| Display / viewport | Expected result |
|---|---|
| 1920 × 1080 | 1:1 canvas in fullscreen |
| 2560 × 1440 | Uniform 1.333× scale |
| 3840 × 2160 | Uniform 2× scale |
| 1920 × 1200 | Centred canvas with slim top/bottom letterboxing |
| 1366 × 768 | Existing responsive/compact layout unless `?kiosk=1` is used |
| 1080p at 125% Windows scaling | Auto kiosk mode based on the 1920 × 1080 physical screen |

## Useful overrides

- `?kiosk=1`: inspect the canonical layout at any browser size.
- `?kiosk=0`: test the responsive fallback.
- `?diagnostics=1`: verify the chosen mode and calculated scale.

When a component is repositioned in `layout-v7.css`, test sunny, rainy, power-cut, and backup states because those exercise every major cable route.
