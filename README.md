# HRV Card

Animated Home Assistant Lovelace card for heat recovery ventilation systems.

The card is intentionally vendor-neutral. You choose the entities you have, regardless of whether the system is Dantherm, Zehnder/ComfoAir, Nilan, Genvex, Brink, or another HRV/ERV unit.

![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![HACS](https://img.shields.io/badge/HACS-custom-blue)

## Features

- Animated airflow diagram
- Temperature-based airflow gradients
- Optional heat recovery and fan RPM display
- Optional mode, bypass, humidity, and fan state badges
- Works with partial configs: missing entities show as `—`
- HACS-ready repository layout
- No runtime dependencies in `ha-hrv-card.js`

## Installation

### HACS custom repository

1. In Home Assistant, go to **HACS → three dots menu → Custom repositories**.
2. Add URL https://github.com/Ralleberg/ha-hrv-card.
3. Select category **Dashboard**.
4. Download the card and refresh the browser.
5. Verify the dashboard resource uses:

   ```yaml
   url: /hacsfiles/ha-hrv-card/ha-hrv-card.js
   type: module
   ```

### Manual installation

1. Copy `ha-hrv-card.js` to:

   ```text
   /config/www/community/ha-hrv-card/ha-hrv-card.js
   ```

2. Add a dashboard resource:

   ```yaml
   url: /local/community/ha-hrv-card/ha-hrv-card.js
   type: module
   ```

3. Refresh the browser.

## Example configuration

```yaml
 type: custom:hrv-card
 entities:
   outdoor_temperature: sensor.dantherm_outdoor_temperature
   supply_temperature: sensor.dantherm_supply_temperature
   extract_temperature: sensor.dantherm_extract_temperature
   exhaust_temperature: sensor.dantherm_exhaust_temperature
   heat_recovery: sensor.dantherm_heat_recovery_efficiency
   humidity: sensor.dantherm_humidity
   bypass: sensor.dantherm_bypass_template
   mode: sensor.dantherm_op_mode_template
   level: sensor.dantherm_op_mode
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
| `entities` | object | no | Entity mapping |
| `appearance` | object | no | Visual options |

### Entities

| Key | Description |
| --- | --- |
| `outdoor_temperature` | Outdoor/fresh air temperature before HRV |
| `supply_temperature` | Supply air temperature after HRV |
| `extract_temperature` | Extract air temperature from rooms |
| `exhaust_temperature` | Exhaust air temperature after HRV |
| `heat_recovery` | Heat recovery efficiency in percent, shown as a compact flow indicator when bypass is not closed |
| `humidity` | Humidity sensor |
| `bypass` | Bypass state/text sensor. Open/åben/on/255 switches the diagram to direct non-crossing airflow |
| `mode` | Operation mode/text sensor |
| `level` | Ventilation level sensor, for example `sensor.dantherm_op_mode` |
| `fan1_rpm` | Fan 1 RPM sensor shown as small italic text beside the upper flow. This controls the upper flow animation speed |
| `fan2_rpm` | Fan 2 RPM sensor shown as small italic text beside the lower flow. This controls the lower flow animation speed |

### Appearance

| Key | Default | Description |
| --- | --- | --- |
| `animation` | `true` | Enable animated airflow |
| `show_labels` | `true` | Show Outdoor/Supply/Extract/Exhaust labels |
| `show_badges` | `true` | Show optional state badges |
| `show_temperatures` | `true` | Show temperature values in the diagram |
| `compact` | `false` | Slightly smaller padding/card size |
| `max_rpm` | `3000` | RPM value treated as full speed for animation scaling. Values from 0-100 are treated as percent-like fan levels |

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
ha-hrv-card.js
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
