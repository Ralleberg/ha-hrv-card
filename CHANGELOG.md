# Changelog

## v2.2.0 - Nilan/Genvex Integration

### Added

- Optional CO2 status circle shown to the left of the bypass status.
- Optional remaining filter-days status circle shown to the right of the bypass status.
- Filter-days warning state: values at `0` or below turn red and fade/blink in a 2 second loop.
- Optional alarm indicator shown as a small red warning triangle when an alarm entity reports an active alarm.
- Alarm entities treat `No Alarm`, `No alarm`, `Ingen`, `0`, `none`, `ok`, `clear`, and `off` as no active alarm.

### Changed

- Extends entity auto-detection for Nilan/Genvex-style names, including CO2, filter days, alarm, Nilan temperatures, humidity, efficiency, fan level, and fan speed entities.
- Keeps the new Nilan/Genvex fields optional so existing Dantherm and generic card configurations keep their current layout unless the new entities are configured.
- Dynamically centers the CO2, bypass, and filter status circles based on which optional entities are configured.
- Documents Nilan/Genvex example entities in the README configuration block.

## v2.0.0 - Theme Surface and Airflow Visibility

This release improves theme integration and makes the animated airflow easier to see.

### Changed

- Uses the Home Assistant theme card background as the actual card surface.
- Aligns background handling with the `vacuum-card` pattern using a single card background CSS variable.
- Keeps only subtle blue/red overlays on top of the theme background.
- Increases airflow line and particle visibility.
- Adds an SVG displacement filter so short airflow strokes render with a soft wavy shape.
- Uses theme-driven text, symbol, arrow, particle, and outline colors for light and dark themes.
- Keeps airflow particles and strokes light on both light and dark themes while other text and symbols follow the active theme.
- Keeps the card editor open while changing values by preserving the existing editor form between updates.
- Reports a larger card/grid size to prevent Lovelace edit mode overlap.
- Removes the extra custom card outline so the card surface matches standard Home Assistant cards.
- Moves inline RPM values further away from the straight bypass flow.
- Adds broader project keywords and README search terms for ventilation, ERV, fan speed, bypass, and common HRV vendors.
- Repositions Fan 1 and Fan 2 RPM next to the Outdoor and Exhaust value groups.
- Uses a non-transparent Home Assistant card background fallback so the card follows light and dark themes more consistently.
- Increases airflow particle and stroke contrast while slightly softening the temperature flow channels.
- Adds a README preview image for the card.
- Keeps package naming aligned as `ha-hrv-card`.
- Aligns card picker registration more closely with `vacuum-card`: simple `window.customCards.push`, async editor creation, and entity-aware stub config.

## v1.0.7b - Straight Bypass Flow Gradient Fix Beta

This beta fixes the straight bypass-open flow so it renders the same wide temperature-colored channels as the crossing layout.

### Fixed

- Uses `userSpaceOnUse` gradients for straight bypass-open flow paths so horizontal strokes render with the full temperature-colored channel.
- Keeps the non-crossing bypass-open geometry.
- Moves Fan 1 and Fan 2 RPM labels closer to their airflow paths.

## v1.0.6b - Bypass Flow Gradient Fix Beta

This beta fixes the visible colored airflow channel when bypass is open.

### Fixed

- Fixes bypass-open flow gradients so the wide airflow channels render with temperature-based colors.
- Keeps subtle airflow line and particle animations on top of the colored flow.
- Keeps README on the latest stable version while beta builds continue in package and runtime metadata.

## v1.0.5b - Airflow Gradient Beta

This beta keeps the latest airflow animation changes and aligns runtime beta metadata.

### Changed

- Keeps README on the latest stable version while beta builds continue in package and runtime metadata.
- Keeps card picker metadata version aligned with the runtime beta version.
- Keeps bypass-open flow gradients and asynchronous airflow fade loops.

## v1.0.4b - Airflow Polish Beta

This beta continues the visual airflow polish and card picker metadata work.

### Changed

- Keeps README on the latest stable version while beta builds continue in package and runtime metadata.
- Keeps card picker metadata version aligned with the runtime beta version.
- Keeps the softer fade-ended flow and subtle airflow line animation from the previous beta.

## v1.0.3b - Card Picker and Flow Refinement Beta

This beta refines the Home Assistant card picker setup and adjusts the flow layout.

### Changed

- Keeps README on the latest stable version while beta builds continue in package and runtime metadata.
- Keeps `getStubConfig()` free of a `type` field for Home Assistant card picker compatibility.
- Adds card picker metadata with documentation URL and runtime version.
- Moves Fan 1 and Fan 2 RPM labels into the flow header/footer area.
- Enlarges the flow strokes to better use the card space.
- Uses direct non-crossing airflow when bypass reports open/åben/on/255.
- Adds softer flow end fades and more subtle animated airflow lines.

## v1.0.2b - Layout Follow-up

This beta follow-up keeps the `custom:hrv-card` registration and adjusts the airflow layout after the bypass changes.

### Changed

- Keeps the card registered for Lovelace as `custom:hrv-card`.
- Removes `type` from the card picker stub config so Home Assistant can inject the selected custom card type.
- Fixes the Exhaust arrow direction.
- Moves Fan 1 RPM next to Outdoor.
- Moves Fan 2 RPM next to Exhaust.
- Moves the lower Exhaust and Supply temperature values back closer to the flow.
- Switches to direct non-crossing airflow when bypass is open/åben/on/255.

## v1.0.1 - Card Picker and Bypass Flow Fixes

This release fixes the card picker registration problem and updates the HRV layout behavior.

### Fixed

- Fixes Home Assistant card picker registration by removing duplicate custom element registration.
- Restores the Lovelace card type to `custom:hrv-card`.
- Ensures the card module reaches `window.customCards.push(...)` without failing during load.
- Uses a proper `CustomEvent` for Home Assistant more-info popups.

### Changed

- Moves bypass from the bottom badge row into the airflow diagram.
- Shows bypass as a simple status circle with the current open/closed state.
- Switches to direct non-crossing airflow when bypass is open/åben/on/255.
- Keeps heat recovery above the flow when bypass is open/on and hides it when bypass is closed/lukket.
- Removes the unused Fan badge.
- Adds a Level badge for sensors such as `sensor.dantherm_op_mode`.
- Moves Fan 1 and Fan 2 RPM values into the flow layout as smaller italic text.

## v1.0.0 - First Stable Release

HRV Card v1.0.0 is the first stable release of the custom Home Assistant Lovelace card for heat recovery ventilation systems.

### Highlights

- Adds a polished animated airflow layout for HRV/ERV systems.
- Adds temperature-based airflow coloring for outdoor, supply, extract, and exhaust air.
- Adds fan RPM display for separate fan sensors.
- Uses individual fan RPM values to control the upper and lower airflow animations.
- Adds a compact heat recovery percentage indicator in the center of the card.
- Adds a bypass status indicator in the flow layout.
- Switches to direct non-crossing airflow when bypass is closed/lukket.
- Supports optional mode, level, bypass, humidity, and temperature display.
- Adds a configurable Level field for sensors such as `sensor.dantherm_op_mode`.
- Supports clickable entity values that open the Home Assistant more-info dialog.
- Adds a visual editor for configuring entities and appearance options from the Lovelace UI.
- Registers the card for the Home Assistant card picker as `HRV Card`.
- Updates the HACS structure so `ha-hrv-card.js` is distributed from the repository root.

### Installation

Use HACS as a custom dashboard repository:

```text
https://github.com/Ralleberg/ha-hrv-card
```

After installing or updating, refresh the browser and verify that the dashboard resource points to:

```yaml
url: /hacsfiles/ha-hrv-card/ha-hrv-card.js
type: module
```

### Notes

- The old `dist/ha-hrv-card.js` output has been removed.
- The canonical distributable file is now `ha-hrv-card.js` in the repository root.
- If Home Assistant still shows an older card version, clear the browser cache and reload the dashboard resource.
