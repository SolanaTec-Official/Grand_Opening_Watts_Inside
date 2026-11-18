# Watt's Inside

This is the cleaned, display-adaptive edition of the Booth 08 interactive. It is a separate copy; the previous `Watts-Inside-Booth-08` folder is unchanged.

Open `index.html` in a current Chromium-based browser. The experience is self-contained and requires no build step or internet connection.

## Display behaviour

V2 uses the same kiosk strategy as Solar Calculator V3:

- The authored composition stays on a fixed 1920 × 1080 design canvas.
- On a 1920 × 1080, 2560 × 1440, or 3840 × 2160 landscape display, the full canvas is uniformly scaled and centred.
- Windows display scaling is detected from the physical screen dimensions, so a 1080p display at 125% scaling still receives the intended kiosk layout.
- Browser chrome and non-16:9 displays are handled with centred letterboxing instead of stretching or cropping the scene.
- Smaller screens retain the existing responsive layout.

URL overrides are available for setup and testing:

| Query | Result |
|---|---|
| `?kiosk=1` | Force the 1920 × 1080 scaled canvas |
| `?kiosk=0` | Force the responsive layout |
| `?diagnostics=1` | Show viewport, physical screen, mode, and scale |
| `?kiosk=1&diagnostics=1` | Force kiosk mode and show diagnostics |

## File ownership

The runtime has been split by responsibility so future changes stay local:

| File | Responsibility |
|---|---|
| `display-adapter.css` | Fixed canvas geometry and large-display fitting |
| `display-adapter.js` | Screen detection, scale calculation, and diagnostics |
| `layout-v7.css` | Equipment placement, panel design, and power-flow presentation |
| `weather-dynamics.css` / `.js` | Animated weather and ambient effects |
| `house-dynamics.css` | Two-storey house, TV, fan, lights, and blackout state |
| `system-states.css` | On-grid, hybrid-ready, and full-backup equipment states |
| `app.js` | Interaction state, language, energy routes, and live wiring geometry |

## Easy layout editing

All equipment positions and sizes remain grouped at the top of `layout-v7.css`. The JavaScript wiring engine reads the final on-screen component rectangles and reconnects each route automatically.

Only change `display-adapter.css` when tuning how the entire experience fits a display. Do not add screen-specific scaling rules to the interaction, house, or weather files.

## Included interactions

- On-grid, hybrid-ready, and full battery-backup configurations
- Solar ATAP and SELCO programme selection
- Sunny, rainy, evening, late-night, power-cut, and backup-power scenarios
- Animated weather, energy paths, ATS switch, fan, television, lamps, and battery state
- English and Chinese interface
- Reset and 60-second idle reset
- Optional Arduino lamp connection through Web Serial at 9600 baud

## Arduino commands

| State | Command |
|---|---|
| Sunny — Solar ATAP | `X` |
| Sunny — SELCO | `S` |
| Rainy | `R` |
| Evening — full backup system | `E` |
| Evening without battery / late night | `G` |
| Power cut | `C` |
| Backup power | `B` |

Each command is followed by a newline. Web Serial requires a compatible Chromium browser and a secure context; `localhost` is suitable for hardware testing.

See `TESTING.md` for the display QA checklist.
