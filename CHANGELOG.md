# Changelog

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
