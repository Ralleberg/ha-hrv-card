class HRVCard extends HTMLElement {
  static getStubConfig() {
    return {
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
    return this._config?.appearance?.compact ? 2 : 3;
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
    if (!Number.isFinite(value)) return "var(--secondary-text-color, rgba(255, 255, 255, .72))";
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

  _gradient(id, from, to, x1 = "0%", y1 = "0%", x2 = "100%", y2 = "0%") {
    return `
      <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
        <stop offset="0%" stop-color="${this._temperatureColor(from)}"></stop>
        <stop offset="100%" stop-color="${this._temperatureColor(to)}"></stop>
      </linearGradient>
    `;
  }

  _particles(path, duration, stopped) {
    const variants = [
      { offset: -13, width: 2.8, gap: 30, alpha: .66, delay: 0 },
      { offset: -7, width: 1.7, gap: 21, alpha: .44, delay: -1.15 },
      { offset: -1, width: 3.4, gap: 38, alpha: .78, delay: -.55 },
      { offset: 6, width: 2.2, gap: 26, alpha: .52, delay: -1.9 },
      { offset: 13, width: 1.5, gap: 18, alpha: .34, delay: -2.45 }
    ];

    return variants.map((variant) => `
            <path
              class="flow-particles ${stopped ? "stopped" : ""}"
              style="--flow-duration:${duration}; --particle-alpha:${variant.alpha}; animation-delay:${variant.delay}s;"
              stroke-width="${variant.width}"
              stroke-dasharray="1 ${variant.gap}"
              transform="translate(0 ${variant.offset})"
              d="${path}"
            ></path>`).join("");
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

  _svgEntityAttrs(entityKey) {
    const entityId = this._entityId(entityKey);
    return entityId ? `class="entity-hit" data-entity="${entityId}"` : "";
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
    const heatRecovery = this._number("heat_recovery");
    const recoveryProgress = Number.isFinite(heatRecovery) ? Math.max(0, Math.min(100, heatRecovery)) : 0;
    const fan1Duration = this._flowDuration("fan1_rpm");
    const fan2Duration = this._flowDuration("fan2_rpm");
    const animationOff = this._config?.appearance?.animation === false;
    const hasBadges = this._config.appearance.show_badges !== false;
    const hasLabels = this._config.appearance.show_labels !== false;
    const hasTemps = this._config.appearance.show_temperatures !== false;
    const compact = this._config.appearance.compact === true;

    const gOutdoorSupply = `${this._id}-outdoor-supply`;
    const gExtractExhaust = `${this._id}-extract-exhaust`;
    const outdoorSupplyPath = "M56 82 H192 C246 82 256 132 310 132 C364 132 374 182 428 182 H564";
    const extractExhaustPath = "M564 82 H428 C374 82 364 132 310 132 C256 132 246 182 192 182 H56";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --hrv-flow-width: 38;
          --hrv-text: var(--hrv-card-text-color, var(--text-primary-color, var(--primary-text-color, #ffffff)));
          --hrv-muted: var(--hrv-card-secondary-text-color, var(--secondary-text-color, rgba(255, 255, 255, .78)));
          --hrv-radius: var(--ha-card-border-radius, 12px);
        }

        ha-card {
          overflow: hidden;
          border-radius: var(--hrv-radius);
          background: transparent !important;
          box-shadow: none;
          border: 0;
          backdrop-filter: blur(8px);
        }

        .card {
          padding: ${compact ? "8px" : "12px"};
          border-radius: var(--hrv-radius);
          background:
            radial-gradient(circle at 16% 28%, color-mix(in srgb, #25a8ff 18%, transparent), transparent 34%),
            radial-gradient(circle at 84% 32%, color-mix(in srgb, #ff5a4f 16%, transparent), transparent 34%),
            color-mix(in srgb, var(--ha-card-background, var(--card-background-color)) 24%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hrv-text) 14%, transparent);
          color: var(--hrv-text) !important;
        }

        svg {
          width: 100%;
          height: auto;
          display: block;
          color: var(--hrv-text) !important;
        }

        svg text {
          fill: var(--hrv-text) !important;
          color: var(--hrv-text) !important;
        }

        .duct-bg {
          fill: none;
          stroke: color-mix(in srgb, var(--hrv-text) 8%, transparent);
          stroke-width: calc(var(--hrv-flow-width) + 10px);
          stroke-linecap: butt;
          stroke-linejoin: round;
        }

        .flow {
          fill: none;
          stroke-width: var(--hrv-flow-width);
          stroke-linecap: butt;
          stroke-linejoin: round;
          opacity: .88;
          filter: drop-shadow(0 0 10px color-mix(in srgb, var(--hrv-text) 18%, transparent));
        }

        .flow-glow {
          fill: none;
          stroke-width: calc(var(--hrv-flow-width) + 14px);
          stroke-linecap: butt;
          stroke-linejoin: round;
          opacity: .28;
          filter: blur(7px);
        }

        .flow-particles {
          fill: none;
          stroke: rgba(255, 255, 255, var(--particle-alpha, .65));
          stroke-linecap: round;
          animation: flow var(--flow-duration, 3.6s) linear infinite;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, .25));
        }

        .flow-particles.reverse {
          animation-direction: reverse;
        }

        .no-animation .flow-particles {
          animation: none;
        }

        .flow-particles.stopped {
          animation: none;
          opacity: .18;
        }

        @keyframes flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -100; }
        }

        .label {
          font-size: 12px;
          fill: var(--hrv-muted) !important;
          color: var(--hrv-muted) !important;
        }

        .temperature {
          font-size: 19px;
          font-weight: 600;
          fill: var(--hrv-text) !important;
          color: var(--hrv-text) !important;
        }

        .side-value {
          font-size: 11px;
          font-weight: 500;
          fill: var(--hrv-text);
        }

        .recovery-circle {
          fill: color-mix(in srgb, var(--ha-card-background, var(--card-background-color)) 22%, transparent);
          stroke: color-mix(in srgb, var(--hrv-text) 18%, transparent);
          stroke-width: 1;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, .24));
        }

        .recovery-ring-bg {
          fill: none;
          stroke: color-mix(in srgb, var(--hrv-text) 18%, transparent);
          stroke-width: 3;
        }

        .recovery-ring {
          fill: none;
          stroke: color-mix(in srgb, #43e683 82%, var(--hrv-text) 18%);
          stroke-width: 3;
          stroke-linecap: round;
        }

        .recovery-value {
          font-size: 17px;
          font-weight: 700;
          fill: var(--hrv-text) !important;
          color: var(--hrv-text) !important;
        }

        .badges {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(82px, 1fr));
          gap: 6px;
          margin-top: 8px;
        }

        .badge {
          appearance: none;
          border: 0;
          border-radius: 8px;
          background: color-mix(in srgb, var(--ha-card-background, var(--card-background-color)) 20%, transparent);
          color: var(--hrv-text) !important;
          padding: 6px 8px;
          text-align: left;
          min-width: 0;
          cursor: pointer;
          font: inherit;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hrv-text) 10%, transparent);
          backdrop-filter: blur(6px);
        }

        .badge:not([data-entity]) {
          cursor: default;
        }

        .entity-hit {
          cursor: pointer;
        }

        .entity-hit:focus-visible {
          outline: 2px solid var(--hrv-text);
          outline-offset: 3px;
        }

        .badge span {
          display: block;
          color: var(--hrv-muted) !important;
          font-size: 10px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge strong {
          display: block;
          margin-top: 2px;
          font-size: 12px;
          line-height: 1.2;
          color: var(--hrv-text) !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>

      <ha-card>
        <div class="card ${animationOff ? "no-animation" : ""}">
          <svg viewBox="0 0 620 260" role="img" aria-label="HRV airflow diagram">
            <defs>
              ${this._gradient(gOutdoorSupply, outdoor, supply)}
              ${this._gradient(gExtractExhaust, exhaust, extract)}
            </defs>

            <path class="duct-bg" d="${outdoorSupplyPath}"></path>
            <path class="duct-bg" d="${extractExhaustPath}"></path>

            <path class="flow-glow" stroke="url(#${gOutdoorSupply})" d="${outdoorSupplyPath}"></path>
            <path class="flow-glow" stroke="url(#${gExtractExhaust})" d="${extractExhaustPath}"></path>
            <path class="flow" stroke="url(#${gOutdoorSupply})" d="${outdoorSupplyPath}"></path>
            <path class="flow" stroke="url(#${gExtractExhaust})" d="${extractExhaustPath}"></path>
            ${this._particles(outdoorSupplyPath, fan1Duration, fan1Duration === "0s")}
            ${this._particles(extractExhaustPath, fan2Duration, fan2Duration === "0s")}

            <g fill="rgba(255, 255, 255, .92)">
              <path d="M96 77 H119 V70 L134 82 L119 94 V87 H96 Z"></path>
              <path d="M524 77 H501 V70 L486 82 L501 94 V87 H524 Z"></path>
              <path d="M128 177 H105 V170 L90 182 L105 194 V187 H128 Z"></path>
              <path d="M492 177 H515 V170 L530 182 L515 194 V187 H492 Z"></path>
            </g>

            <g ${this._svgEntityAttrs("outdoor_temperature")} tabindex="0">
              <rect x="18" y="8" width="100" height="56" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="68" y="28" text-anchor="middle" class="label">Outdoor</text>` : ""}
              ${hasTemps ? `<text x="68" y="54" text-anchor="middle" class="temperature">${this._formatTemp("outdoor_temperature")}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs("extract_temperature")} tabindex="0">
              <rect x="502" y="8" width="100" height="56" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="552" y="28" text-anchor="middle" class="label">Extract</text>` : ""}
              ${hasTemps ? `<text x="552" y="54" text-anchor="middle" class="temperature">${this._formatTemp("extract_temperature")}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs("supply_temperature")} tabindex="0">
              <rect x="502" y="206" width="100" height="52" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="552" y="226" text-anchor="middle" class="label">Supply</text>` : ""}
              ${hasTemps ? `<text x="552" y="252" text-anchor="middle" class="temperature">${this._formatTemp("supply_temperature")}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs("exhaust_temperature")} tabindex="0">
              <rect x="18" y="206" width="100" height="52" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="68" y="226" text-anchor="middle" class="label">Exhaust</text>` : ""}
              ${hasTemps ? `<text x="68" y="252" text-anchor="middle" class="temperature">${this._formatTemp("exhaust_temperature")}</text>` : ""}
            </g>

            <g ${this._svgEntityAttrs("heat_recovery")} tabindex="0" transform="translate(310 46)">
              <circle class="recovery-circle" cx="0" cy="0" r="32"></circle>
              <circle class="recovery-ring-bg" cx="0" cy="0" r="26"></circle>
              <circle class="recovery-ring" cx="0" cy="0" r="26" pathLength="100" stroke-dasharray="${recoveryProgress} 100" transform="rotate(-90 0 0)"></circle>
              <text x="0" y="6" text-anchor="middle" class="recovery-value">${this._formatNumber("heat_recovery", 0, "%")}</text>
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
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._fireMoreInfo(element.dataset.entity);
        }
      });
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
