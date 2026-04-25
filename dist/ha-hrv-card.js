class HRVCard extends HTMLElement {
  static getStubConfig() {
    return {
      title: "HRV",
      entities: {
        outdoor_temperature: "sensor.outdoor_temperature",
        supply_temperature: "sensor.supply_temperature",
        extract_temperature: "sensor.extract_temperature",
        exhaust_temperature: "sensor.exhaust_temperature",
        heat_recovery: "sensor.heat_recovery_efficiency",
        humidity: "sensor.humidity",
        bypass: "sensor.bypass",
        mode: "sensor.mode",
        fan_speed: "sensor.fan_speed",
        fan1_rpm: "sensor.dantherm_fan1_rpm",
        fan2_rpm: "sensor.dantherm_fan2_rpm"
      },
      appearance: {
        animation: true,
        show_labels: true,
        show_badges: true,
        show_temperatures: true,
        compact: false
      }
    };
  }

  static getConfigElement() {
    return document.createElement("hrv-card-editor");
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
    this._id = `hrv-${Math.random().toString(36).slice(2, 10)}`;
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = {
      title: "HRV",
      entities: {},
      appearance: {
        animation: true,
        show_labels: true,
        show_badges: true,
        show_temperatures: true,
        compact: false
      },
      ...config,
      entities: {
        ...(config.entities || {})
      },
      appearance: {
        animation: true,
        show_labels: true,
        show_badges: true,
        show_temperatures: true,
        compact: false,
        ...(config.appearance || {})
      }
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return this._config?.appearance?.compact ? 3 : 4;
  }

  _entityId(key) {
    return this._config?.entities?.[key];
  }

  _entity(key) {
    const entityId = this._entityId(key);
    return entityId && this._hass ? this._hass.states[entityId] : undefined;
  }

  _state(key) {
    const entity = this._entity(key);
    if (!entity || entity.state === "unknown" || entity.state === "unavailable") {
      return undefined;
    }
    return entity.state;
  }

  _number(key) {
    const value = Number.parseFloat(this._state(key));
    return Number.isFinite(value) ? value : undefined;
  }

  _unit(key, fallback = "") {
    return this._entity(key)?.attributes?.unit_of_measurement || fallback;
  }

  _formatTemp(key) {
    const value = this._number(key);
    if (value === undefined) return "—";
    return `${value.toFixed(1)}${this._unit(key, "°C")}`;
  }

  _formatState(key, suffix = "") {
    const value = this._state(key);
    if (value === undefined) return "—";
    return `${value}${suffix}`;
  }

  _formatNumber(key, decimals = 0, suffix = "") {
    const value = this._number(key);
    if (value === undefined) return "—";
    return `${value.toFixed(decimals)}${suffix}`;
  }

  _formatRpm(key) {
    const value = this._number(key);
    if (value === undefined) return "—";
    return `${value.toFixed(0)} ${this._unit(key, "rpm")}`;
  }

  _temperatureColor(value) {
    if (!Number.isFinite(value)) return "var(--secondary-text-color)";
    const clamped = Math.max(-10, Math.min(35, value));
    const ratio = (clamped + 10) / 45;
    const hue = 215 - ratio * 205;
    return `hsl(${hue}, 78%, 56%)`;
  }

  _flowDuration(key) {
    if (this._config?.appearance?.animation === false) return "0s";
    const speed = this._number(key);
    if (!Number.isFinite(speed)) return "3.6s";
    if (speed <= 0) return "0s";

    const maxRpm = Number.parseFloat(this._config?.appearance?.max_rpm);
    const rpmCeiling = Number.isFinite(maxRpm) && maxRpm > 0 ? maxRpm : 3000;
    const normalized = speed <= 100
      ? Math.max(0, Math.min(100, speed)) / 100
      : Math.max(0, Math.min(rpmCeiling, speed)) / rpmCeiling;

    return `${5.2 - normalized * 3.5}s`;
  }

  _gradient(id, from, to) {
    return `
      <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${this._temperatureColor(from)}"></stop>
        <stop offset="100%" stop-color="${this._temperatureColor(to)}"></stop>
      </linearGradient>
    `;
  }

  _badge(label, value, entityKey) {
    const entityId = this._entityId(entityKey);
    const clickable = entityId ? `data-entity="${entityId}"` : "";
    return `
      <button class="badge" ${clickable}>
        <span>${label}</span>
        <strong>${value}</strong>
      </button>
    `;
  }

  _fireMoreInfo(entityId) {
    const event = new Event("hass-more-info", { bubbles: true, composed: true });
    event.detail = { entityId };
    this.dispatchEvent(event);
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const outdoor = this._number("outdoor_temperature");
    const supply = this._number("supply_temperature");
    const extract = this._number("extract_temperature");
    const exhaust = this._number("exhaust_temperature");
    const fan1Duration = this._flowDuration("fan1_rpm");
    const fan2Duration = this._flowDuration("fan2_rpm");
    const animationOff = this._config?.appearance?.animation === false;
    const hasBadges = this._config.appearance.show_badges !== false;
    const hasLabels = this._config.appearance.show_labels !== false;
    const hasTemps = this._config.appearance.show_temperatures !== false;
    const compact = this._config.appearance.compact === true;

    const gOutdoorSupply = `${this._id}-outdoor-supply`;
    const gExtractExhaust = `${this._id}-extract-exhaust`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --hrv-flow-width: 32;
          --hrv-muted: var(--secondary-text-color);
          --hrv-radius: var(--ha-card-border-radius, 12px);
        }

        ha-card {
          overflow: hidden;
          border-radius: var(--hrv-radius);
        }

        .card {
          padding: ${compact ? "12px" : "16px"};
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--primary-text-color);
        }

        .subtitle {
          color: var(--secondary-text-color);
          font-size: 12px;
          margin-top: 2px;
        }

        .recovery {
          min-width: 72px;
          text-align: right;
        }

        .recovery strong {
          display: block;
          font-size: 22px;
          line-height: 1;
          color: var(--primary-text-color);
        }

        .recovery span {
          color: var(--secondary-text-color);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .duct-bg {
          fill: none;
          stroke: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
          stroke-width: var(--hrv-flow-width);
          stroke-linecap: butt;
          stroke-linejoin: round;
        }

        .flow {
          fill: none;
          stroke-width: var(--hrv-flow-width);
          stroke-linecap: butt;
          stroke-linejoin: round;
        }

        .flow-dots {
          fill: none;
          stroke: rgba(255, 255, 255, .78);
          stroke-width: 5;
          stroke-linecap: round;
          stroke-dasharray: 1 24;
          animation: flow var(--flow-duration, 3.6s) linear infinite;
          filter: drop-shadow(0 0 5px color-mix(in srgb, var(--primary-text-color) 12%, transparent));
        }

        .flow-dots.reverse {
          animation-direction: reverse;
        }

        .no-animation .flow-dots {
          animation: none;
          stroke-dasharray: none;
        }

        .flow-dots.stopped {
          animation: none;
          stroke-dasharray: none;
        }

        @keyframes flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -100; }
        }

        .label {
          font-size: 12px;
          fill: var(--secondary-text-color);
        }

        .temperature {
          font-size: 15px;
          font-weight: 600;
          fill: var(--primary-text-color);
        }

        .side-value {
          font-size: 14px;
          font-weight: 500;
          fill: var(--primary-text-color);
        }

        .icon {
          fill: var(--primary-text-color);
          opacity: .9;
        }

        .fan-blade {
          fill: var(--primary-text-color);
          opacity: .9;
          transform-box: fill-box;
          transform-origin: center;
        }

        .fan-on .fan-blade {
          animation: fanSpin var(--flow-duration, 3.6s) linear infinite;
        }

        .no-animation .fan-blade {
          animation: none;
        }

        .fan-on.stopped .fan-blade {
          animation: none;
        }

        @keyframes fanSpin {
          to { transform: rotate(360deg); }
        }

        .badges {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .badge {
          appearance: none;
          border: 0;
          border-radius: 10px;
          background: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
          color: var(--primary-text-color);
          padding: 9px 10px;
          text-align: left;
          min-width: 0;
          cursor: pointer;
          font: inherit;
        }

        .badge:not([data-entity]) {
          cursor: default;
        }

        .badge span {
          display: block;
          color: var(--secondary-text-color);
          font-size: 11px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge strong {
          display: block;
          margin-top: 3px;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>

      <ha-card>
        <div class="card ${animationOff ? "no-animation" : ""}">
          <div class="header">
            <div>
              <h2>${this._config.title || "HRV"}</h2>
              <div class="subtitle">Heat recovery ventilation</div>
            </div>
            <div class="recovery">
              <strong>${this._formatNumber("heat_recovery", 0, "%")}</strong>
              <span>Recovery</span>
            </div>
          </div>

          <svg viewBox="0 0 620 280" role="img" aria-label="HRV airflow diagram">
            <defs>
              ${this._gradient(gOutdoorSupply, outdoor, supply)}
              ${this._gradient(gExtractExhaust, extract, exhaust)}
            </defs>

            <path class="duct-bg" d="M46 88 L142 88 L250 132 L370 178 L478 220 L574 220"></path>
            <path class="duct-bg" d="M574 88 L478 88 L370 132 L250 178 L142 220 L46 220"></path>

            <path class="flow" stroke="url(#${gOutdoorSupply})" d="M46 88 L142 88 L250 132 L370 178 L478 220 L574 220"></path>
            <path class="flow" stroke="url(#${gExtractExhaust})" d="M574 88 L478 88 L370 132 L250 178 L142 220 L46 220"></path>
            <path class="flow-dots ${fan1Duration === "0s" ? "stopped" : ""}" style="--flow-duration:${fan1Duration}" d="M46 88 L142 88 L250 132 L370 178 L478 220 L574 220"></path>
            <path class="flow-dots ${fan2Duration === "0s" ? "stopped" : ""}" style="--flow-duration:${fan2Duration}" d="M574 88 L478 88 L370 132 L250 178 L142 220 L46 220"></path>

            <g fill="rgba(255, 255, 255, .92)">
              <path d="M70 83 H110 V75 L128 88 L110 101 V93 H70 Z"></path>
              <path d="M550 83 H510 V75 L492 88 L510 101 V93 H550 Z"></path>
              <path d="M116 215 H76 V207 L58 220 L76 233 V225 H116 Z"></path>
              <path d="M504 215 H544 V207 L562 220 L544 233 V225 H504 Z"></path>
            </g>

            ${hasLabels ? `<text x="55" y="52" text-anchor="middle" class="label">Outdoor</text>` : ""}
            ${hasLabels ? `<text x="565" y="52" text-anchor="middle" class="label">Extract</text>` : ""}
            ${hasLabels ? `<text x="565" y="174" text-anchor="middle" class="label">Supply</text>` : ""}
            ${hasLabels ? `<text x="55" y="174" text-anchor="middle" class="label">Exhaust</text>` : ""}

            ${hasTemps ? `<text x="55" y="72" text-anchor="middle" class="temperature">${this._formatTemp("outdoor_temperature")}</text>` : ""}
            ${hasTemps ? `<text x="565" y="72" text-anchor="middle" class="temperature">${this._formatTemp("extract_temperature")}</text>` : ""}
            ${hasTemps ? `<text x="565" y="196" text-anchor="middle" class="temperature">${this._formatTemp("supply_temperature")}</text>` : ""}
            ${hasTemps ? `<text x="55" y="196" text-anchor="middle" class="temperature">${this._formatTemp("exhaust_temperature")}</text>` : ""}

            <g transform="translate(18 102)">
              <path class="icon" d="M20 2 A18 18 0 0 0 3 20 H8 A13 13 0 0 1 20 7 Z M5 24 A18 18 0 0 0 35 33 L31 30 A13 13 0 0 1 10 24 Z M33 7 L24 26 L20 22 L15 38 L28 20 L24 24 Z"></path>
              <text x="42" y="24" class="side-value">${this._formatRpm("fan1_rpm")}</text>
            </g>
            <g transform="translate(18 234)">
              <path class="icon" d="M20 2 A18 18 0 0 0 3 20 H8 A13 13 0 0 1 20 7 Z M5 24 A18 18 0 0 0 35 33 L31 30 A13 13 0 0 1 10 24 Z M33 7 L24 26 L20 22 L15 38 L28 20 L24 24 Z"></path>
              <text x="42" y="24" class="side-value">${this._formatRpm("fan2_rpm")}</text>
            </g>
            <g class="fan-on ${fan1Duration === "0s" ? "stopped" : ""}" style="--flow-duration:${fan1Duration}" transform="translate(532 102)">
              <path class="fan-blade" d="M12 20 C4 15 4 6 12 4 C18 2 22 8 19 14 C25 11 33 15 34 23 C35 31 26 34 21 29 C22 36 16 42 8 39 C1 36 1 27 8 24 C11 23 12 22 12 20 Z"></path>
              <circle cx="18" cy="22" r="4" fill="var(--card-background-color, #fff)"></circle>
              <text x="42" y="27" class="side-value">${this._formatNumber("fan_speed", 0, "%")}</text>
            </g>
            <g class="fan-on ${fan2Duration === "0s" ? "stopped" : ""}" style="--flow-duration:${fan2Duration}" transform="translate(532 234)">
              <path class="fan-blade" d="M12 20 C4 15 4 6 12 4 C18 2 22 8 19 14 C25 11 33 15 34 23 C35 31 26 34 21 29 C22 36 16 42 8 39 C1 36 1 27 8 24 C11 23 12 22 12 20 Z"></path>
              <circle cx="18" cy="22" r="4" fill="var(--card-background-color, #fff)"></circle>
              <text x="42" y="27" class="side-value">${this._formatNumber("fan_speed", 0, "%")}</text>
            </g>
          </svg>

          ${hasBadges ? `
            <div class="badges">
              ${this._badge("Mode", this._formatState("mode"), "mode")}
              ${this._badge("Bypass", this._formatState("bypass"), "bypass")}
              ${this._badge("Humidity", this._formatNumber("humidity", 0, "%"), "humidity")}
              ${this._badge("Fan", this._formatState("fan_speed"), "fan_speed")}
              ${this._badge("Fan 1", this._formatRpm("fan1_rpm"), "fan1_rpm")}
              ${this._badge("Fan 2", this._formatRpm("fan2_rpm"), "fan2_rpm")}
            </div>
          ` : ""}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll("[data-entity]").forEach((element) => {
      element.addEventListener("click", () => this._fireMoreInfo(element.dataset.entity));
    });
  }
}

class HRVCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _value(path, fallback = "") {
    return path.split(".").reduce((value, key) => value?.[key], this._config) || fallback;
  }

  _changed(path, value) {
    const next = structuredClone(this._config || {});
    const parts = path.split(".");
    let target = next;
    while (parts.length > 1) {
      const part = parts.shift();
      target[part] = target[part] || {};
      target = target[part];
    }
    target[parts[0]] = value || undefined;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: next },
      bubbles: true,
      composed: true
    }));
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          display: grid;
          gap: 12px;
        }
        label {
          display: grid;
          gap: 4px;
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        input {
          box-sizing: border-box;
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        h3 {
          margin: 10px 0 0;
          font-size: 14px;
          color: var(--primary-text-color);
        }
      </style>
      <div class="editor">
        <label>Title<input data-path="title" value="${this._value("title", "HRV")}"></label>
        <h3>Temperature entities</h3>
        <label>Outdoor temperature<input data-path="entities.outdoor_temperature" value="${this._value("entities.outdoor_temperature")}"></label>
        <label>Supply temperature<input data-path="entities.supply_temperature" value="${this._value("entities.supply_temperature")}"></label>
        <label>Extract temperature<input data-path="entities.extract_temperature" value="${this._value("entities.extract_temperature")}"></label>
        <label>Exhaust temperature<input data-path="entities.exhaust_temperature" value="${this._value("entities.exhaust_temperature")}"></label>
        <h3>Optional entities</h3>
        <label>Heat recovery<input data-path="entities.heat_recovery" value="${this._value("entities.heat_recovery")}"></label>
        <label>Humidity<input data-path="entities.humidity" value="${this._value("entities.humidity")}"></label>
        <label>Bypass<input data-path="entities.bypass" value="${this._value("entities.bypass")}"></label>
        <label>Mode<input data-path="entities.mode" value="${this._value("entities.mode")}"></label>
        <label>Fan speed<input data-path="entities.fan_speed" value="${this._value("entities.fan_speed")}"></label>
        <label>Fan 1 RPM<input data-path="entities.fan1_rpm" value="${this._value("entities.fan1_rpm")}"></label>
        <label>Fan 2 RPM<input data-path="entities.fan2_rpm" value="${this._value("entities.fan2_rpm")}"></label>
      </div>
    `;

    this.shadowRoot.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => this._changed(input.dataset.path, input.value));
    });
  }
}

if (!customElements.get("hrv-card")) {
  customElements.define("hrv-card", HRVCard);
}

if (!customElements.get("ha-hrv-card")) {
  customElements.define("ha-hrv-card", HRVCard);
}

if (!customElements.get("hrv-card-editor")) {
  customElements.define("hrv-card-editor", HRVCardEditor);
}

window.customCards = window.customCards || [];

if (!window.customCards.some((card) => card.type === "hrv-card")) {
  window.customCards.push({
    type: "hrv-card",
    name: "HRV Card",
    description: "Animated heat recovery ventilation card with temperature gradients",
    preview: true
  });
}

if (!window.customCards.some((card) => card.type === "ha-hrv-card")) {
  window.customCards.push({
    type: "ha-hrv-card",
    name: "HA HRV Card",
    description: "Animated heat recovery ventilation card with temperature gradients",
    preview: true
  });
}
