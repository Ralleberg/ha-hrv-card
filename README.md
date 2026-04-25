# HRV Card

Animated Home Assistant Lovelace card for heat recovery ventilation systems.

The card is intentionally vendor-neutral. You choose the entities you have, regardless of whether the system is Dantherm, Zehnder/ComfoAir, Nilan, Genvex, Brink, or another HRV/ERV unit.

![Status](https://img.shields.io/badge/status-early%20development-orange)
![HACS](https://img.shields.io/badge/HACS-custom-blue)

## Features

- Animated airflow diagram
- Temperature-based airflow gradients
- Optional heat recovery efficiency and fan RPM display
- Optional mode, bypass, humidity, and fan state badges
- Works with partial configs: missing entities show as `—`
- HACS-ready repository layout
- No runtime dependencies in `dist/hrv-card.js`

## Installation

### HACS custom repository

1. Create a public GitHub repository from this project.
2. Create a release containing `dist/hrv-card.js`.
3. In Home Assistant, go to **HACS → three dots menu → Custom repositories**.
4. Add your repository URL.
5. Select category **Dashboard**.
6. Download the card and refresh the browser.

### Manual installation

1. Copy `dist/hrv-card.js` to:

   ```text
   /config/www/community/lovelace-hrv-card/hrv-card.js
   ```

2. Add a dashboard resource:

   ```yaml
   url: /local/community/lovelace-hrv-card/hrv-card.js
   type: module
   ```

3. Refresh the browser.

## Example configuration

```yaml
 type: custom:hrv-card
 title: Ventilation
 entities:
   outdoor_temperature: sensor.dantherm_outdoor_temperature
   supply_temperature: sensor.dantherm_supply_temperature
   extract_temperature: sensor.dantherm_extract_temperature
   exhaust_temperature: sensor.dantherm_exhaust_temperature
   heat_recovery: sensor.dantherm_heat_recovery_efficiency
   humidity: sensor.dantherm_humidity
   bypass: sensor.dantherm_bypass_template
   mode: sensor.dantherm_op_mode_template
   fan_speed: sensor.dantherm_fan_state
   fan1_rpm: sensor.dantherm_fan1_rpm
   fan2_rpm: sensor.dantherm_fan2_rpm
 appearance:
   animation: true
   show_labels: true
   show_badges: true
   show_temperatures: true
   compact: false
```

## Configuration

### Main options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | yes | Must be `custom:hrv-card` |
| `title` | string | no | Card title |
| `entities` | object | no | Entity mapping |
| `appearance` | object | no | Visual options |

### Entities

| Key | Description |
| --- | --- |
| `outdoor_temperature` | Outdoor/fresh air temperature before HRV |
| `supply_temperature` | Supply air temperature after HRV |
| `extract_temperature` | Extract air temperature from rooms |
| `exhaust_temperature` | Exhaust air temperature after HRV |
| `heat_recovery` | Heat recovery efficiency in percent |
| `humidity` | Humidity sensor |
| `bypass` | Bypass state/text sensor |
| `mode` | Operation mode/text sensor |
| `fan_speed` | Fan speed/state. Numeric 0-100 values affect animation speed |
| `fan1_rpm` | Fan 1 RPM sensor shown beside the upper flow |
| `fan2_rpm` | Fan 2 RPM sensor shown beside the lower flow |

### Appearance

| Key | Default | Description |
| --- | --- | --- |
| `animation` | `true` | Enable animated airflow |
| `show_labels` | `true` | Show Outdoor/Supply/Extract/Exhaust labels |
| `show_badges` | `true` | Show optional state badges |
| `show_temperatures` | `true` | Show temperature values in the diagram |
| `compact` | `false` | Slightly smaller padding/card size |

## Development

```bash
npm install
npm run dev
```

For production build:

```bash
npm run build
```

The distributable file is written to:

```text
dist/hrv-card.js
```

## Roadmap

- Better visual editor using Home Assistant entity pickers
- More layout variants
- Optional airflow direction labels
- Optional internal heat recovery calculation if all temperature entities are available
- Theming with CSS variables
- Translations

## Credits

Inspired by older ventilation Lovelace cards such as `lovelace-comfoair`, but implemented as a new vendor-neutral HRV card.
