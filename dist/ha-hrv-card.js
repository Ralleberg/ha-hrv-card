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
        fan_speed: "sensor.fan_speed"
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

  _temperatureColor(value) {
    if (!Number.isFinite(value)) return "var(--secondary-text-color)";
    const points = [
      { temp: -10, color: [255, 255, 255] },
      { temp: 0, color: [38, 149, 255] },
      { temp: 15, color: [72, 222, 73] },
      { temp: 21, color: [255, 211, 64] },
      { temp: 30, color: [255, 64, 64] }
    ];
    const clamped = Math.max(points[0].temp, Math.min(points[points.length - 1].temp, value));
    const upperIndex = points.findIndex((point) => clamped <= point.temp);
    const upper = points[Math.max(upperIndex, 1)];
    const lower = points[Math.max(upperIndex - 1, 0)];
    const ratio = upper.temp === lower.temp ? 0 : (clamped - lower.temp) / (upper.temp - lower.temp);
    const color = lower.color.map((channel, index) => Math.round(channel + (upper.color[index] - channel) * ratio));
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  _particleColor(value) {
    if (!Number.isFinite(value)) return "white";
    return value <= -7 ? "#111" : "white";
  }

  _animationDuration() {
    if (this._config?.appearance?.animation === false) return "0s";
    const speed = this._number("fan_speed");
    if (!Number.isFinite(speed)) return "3.6s";
    const normalized = Math.max(0, Math.min(100, speed));
    return `${5.2 - normalized * 0.035}s`;
  }

  _gradient(id, from, to, x1 = "0%", y1 = "0%", x2 = "100%", y2 = "0%") {
    return `
      <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
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
    const duration = this._animationDuration();
    const hasBadges = this._config.appearance.show_badges !== false;
    const hasLabels = this._config.appearance.show_labels !== false;
    const hasTemps = this._config.appearance.show_temperatures !== false;
    const compact = this._config.appearance.compact === true;

    const gOutdoorSupply = `${this._id}-outdoor-supply`;
    const gExtractExhaust = `${this._id}-extract-exhaust`;
    const pOutdoorCore = `${this._id}-path-outdoor-core`;
    const pSupplyExit = `${this._id}-path-supply-exit`;
    const pExtractCore = `${this._id}-path-extract-core`;
    const pCoreExhaust = `${this._id}-path-core-exhaust`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --hrv-core-fill: var(--card-background-color, #fff);
          --hrv-core-stroke: color-mix(in srgb, var(--primary-text-color) 20%, transparent);
          --hrv-flow-width: 16;
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
          stroke-linecap: round;
        }

        .flow {
          fill: none;
          stroke-width: var(--hrv-flow-width);
          stroke-linecap: round;
          filter: drop-shadow(0 0 6px color-mix(in srgb, var(--primary-text-color) 14%, transparent));
        }

        .particle {
          fill: var(--particle-color, white);
          opacity: .9;
          filter: drop-shadow(0 0 5px currentColor);
        }

        .no-animation .particle {
          display: none;
        }

        .core {
          fill: var(--hrv-core-fill);
          stroke: var(--hrv-core-stroke);
          stroke-width: 1.5;
          filter: drop-shadow(0 2px 7px color-mix(in srgb, black 14%, transparent));
        }

        .core-line {
          stroke: color-mix(in srgb, var(--primary-text-color) 18%, transparent);
          stroke-width: 1;
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
        <div class="card ${duration === "0s" ? "no-animation" : ""}" style="--duration:${duration}">
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
              ${this._gradient(gOutdoorSupply, outdoor, supply, "0%", "0%", "100%", "0%")}
              ${this._gradient(gExtractExhaust, extract, exhaust, "100%", "0%", "0%", "0%")}
            </defs>

            <path id="${pOutdoorCore}" class="duct-bg" d="M55 192 C155 192 190 192 264 162"></path>
            <path id="${pSupplyExit}" class="duct-bg" d="M356 118 C430 88 465 88 565 88"></path>
            <path id="${pExtractCore}" class="duct-bg" d="M565 192 C465 192 430 192 356 162"></path>
            <path id="${pCoreExhaust}" class="duct-bg" d="M264 118 C190 88 155 88 55 88"></path>

            <path class="flow" stroke="url(#${gOutdoorSupply})" d="M55 192 C155 192 190 192 264 162"></path>
            <path class="flow" stroke="url(#${gOutdoorSupply})" d="M356 118 C430 88 465 88 565 88"></path>
            <path class="flow" stroke="url(#${gExtractExhaust})" d="M565 192 C465 192 430 192 356 162"></path>
            <path class="flow" stroke="url(#${gExtractExhaust})" d="M264 118 C190 88 155 88 55 88"></path>

            <g class="particles">
              <circle r="3.2" class="particle" style="--particle-color:${this._particleColor(outdoor)}">
                <animateMotion dur="${duration}" begin="0s" repeatCount="indefinite"><mpath href="#${pOutdoorCore}"></mpath></animateMotion>
              </circle>
              <circle r="2.4" class="particle" style="--particle-color:${this._particleColor(outdoor)}">
                <animateMotion dur="${duration}" begin="-.9s" repeatCount="indefinite"><mpath href="#${pOutdoorCore}"></mpath></animateMotion>
              </circle>
              <circle r="2.8" class="particle" style="--particle-color:${this._particleColor(outdoor)}">
                <animateMotion dur="${duration}" begin="-1.8s" repeatCount="indefinite"><mpath href="#${pOutdoorCore}"></mpath></animateMotion>
              </circle>

              <circle r="3.2" class="particle" style="--particle-color:${this._particleColor(supply)}">
                <animateMotion dur="${duration}" begin="-.35s" repeatCount="indefinite"><mpath href="#${pSupplyExit}"></mpath></animateMotion>
              </circle>
              <circle r="2.4" class="particle" style="--particle-color:${this._particleColor(supply)}">
                <animateMotion dur="${duration}" begin="-1.25s" repeatCount="indefinite"><mpath href="#${pSupplyExit}"></mpath></animateMotion>
              </circle>
              <circle r="2.8" class="particle" style="--particle-color:${this._particleColor(supply)}">
                <animateMotion dur="${duration}" begin="-2.15s" repeatCount="indefinite"><mpath href="#${pSupplyExit}"></mpath></animateMotion>
              </circle>

              <circle r="3.2" class="particle" style="--particle-color:${this._particleColor(extract)}">
                <animateMotion dur="${duration}" begin="-.15s" repeatCount="indefinite"><mpath href="#${pExtractCore}"></mpath></animateMotion>
              </circle>
              <circle r="2.4" class="particle" style="--particle-color:${this._particleColor(extract)}">
                <animateMotion dur="${duration}" begin="-1.05s" repeatCount="indefinite"><mpath href="#${pExtractCore}"></mpath></animateMotion>
              </circle>
              <circle r="2.8" class="particle" style="--particle-color:${this._particleColor(extract)}">
                <animateMotion dur="${duration}" begin="-1.95s" repeatCount="indefinite"><mpath href="#${pExtractCore}"></mpath></animateMotion>
              </circle>

              <circle r="3.2" class="particle" style="--particle-color:${this._particleColor(exhaust)}">
                <animateMotion dur="${duration}" begin="-.5s" repeatCount="indefinite"><mpath href="#${pCoreExhaust}"></mpath></animateMotion>
              </circle>
              <circle r="2.4" class="particle" style="--particle-color:${this._particleColor(exhaust)}">
                <animateMotion dur="${duration}" begin="-1.4s" repeatCount="indefinite"><mpath href="#${pCoreExhaust}"></mpath></animateMotion>
              </circle>
              <circle r="2.8" class="particle" style="--particle-color:${this._particleColor(exhaust)}">
                <animateMotion dur="${duration}" begin="-2.3s" repeatCount="indefinite"><mpath href="#${pCoreExhaust}"></mpath></animateMotion>
              </circle>
            </g>

            <rect class="core" x="264" y="90" width="92" height="100" rx="17"></rect>
            <line class="core-line" x1="280" y1="108" x2="340" y2="172"></line>
            <line class="core-line" x1="340" y1="108" x2="280" y2="172"></line>
            <text x="310" y="146" text-anchor="middle" class="temperature">HRV</text>

            ${hasLabels ? `<text x="55" y="52" text-anchor="middle" class="label">Exhaust</text>` : ""}
            ${hasLabels ? `<text x="565" y="52" text-anchor="middle" class="label">Supply</text>` : ""}
            ${hasLabels ? `<text x="565" y="236" text-anchor="middle" class="label">Extract</text>` : ""}
            ${hasLabels ? `<text x="55" y="236" text-anchor="middle" class="label">Outdoor</text>` : ""}

            ${hasTemps ? `<text x="55" y="72" text-anchor="middle" class="temperature">${this._formatTemp("exhaust_temperature")}</text>` : ""}
            ${hasTemps ? `<text x="565" y="72" text-anchor="middle" class="temperature">${this._formatTemp("supply_temperature")}</text>` : ""}
            ${hasTemps ? `<text x="565" y="258" text-anchor="middle" class="temperature">${this._formatTemp("extract_temperature")}</text>` : ""}
            ${hasTemps ? `<text x="55" y="258" text-anchor="middle" class="temperature">${this._formatTemp("outdoor_temperature")}</text>` : ""}
          </svg>

          ${hasBadges ? `
            <div class="badges">
              ${this._badge("Mode", this._formatState("mode"), "mode")}
              ${this._badge("Bypass", this._formatState("bypass"), "bypass")}
              ${this._badge("Humidity", this._formatNumber("humidity", 0, "%"), "humidity")}
              ${this._badge("Fan", this._formatState("fan_speed"), "fan_speed")}
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

console.info(
  "%c HRV Card %c loaded ",
  "color: white; background: #03a9f4; font-weight: 700; padding: 2px 4px; border-radius: 3px 0 0 3px;",
  "color: white; background: #4caf50; font-weight: 700; padding: 2px 4px; border-radius: 0 3px 3px 0;"
);
