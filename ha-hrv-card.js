class HRVCard extends HTMLElement {
  static getStubConfig(_hass, entities = []) {
    const entityIds = Array.isArray(entities)
      ? entities.map((entity) => typeof entity === "string" ? entity : entity?.entity_id).filter(Boolean)
      : [];
    const findEntity = (patterns, fallback) => entityIds.find((entityId) => patterns.some((pattern) => entityId.includes(pattern))) || fallback;

    return {
      entities: {
        outdoor_temperature: findEntity(["outdoor", "outside", "ude"], "sensor.outdoor_temperature"),
        supply_temperature: findEntity(["supply", "indblaes", "indblæs"], "sensor.supply_temperature"),
        extract_temperature: findEntity(["extract", "udsug"], "sensor.extract_temperature"),
        exhaust_temperature: findEntity(["exhaust", "afkast"], "sensor.exhaust_temperature"),
        heat_recovery: findEntity(["heat_recovery", "recovery", "genvinding"], "sensor.heat_recovery_efficiency"),
        humidity: findEntity(["humidity", "fugt"], "sensor.humidity"),
        bypass: findEntity(["bypass_damper", "bypass"], "cover.dantherm_bypass_damper"),
        mode: findEntity(["operation_selection", "operation_mode", "op_mode", "mode"], "select.dantherm_operation_selection"),
        level: findEntity(["fan_level_selection", "fan_level", "op_mode", "level"], "select.dantherm_fan_level_selection"),
        fan1_rpm: findEntity(["fan1_speed", "fan1_rpm", "fan_1_rpm"], "sensor.dantherm_fan1_speed"),
        fan2_rpm: findEntity(["fan2_speed", "fan2_rpm", "fan_2_rpm"], "sensor.dantherm_fan2_speed")
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

  static async getConfigElement() {
    return document.createElement("hrv-card-editor");
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = undefined;
    this._id = `hrv-${Math.random().toString(36).slice(2, 10)}`;
    this._lastRenderSignature = "";
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
    this._lastRenderSignature = "";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const nextSignature = this._renderSignature();
    if (nextSignature === this._lastRenderSignature) return;
    this._render();
  }

  getCardSize() {
    return this._config?.appearance?.compact ? 3 : 4;
  }

  getGridOptions() {
    return {
      rows: this._config?.appearance?.compact ? 3 : 4,
      columns: 12,
      min_rows: 3
    };
  }

  _renderSignature() {
    const entityKeys = [
      "outdoor_temperature",
      "supply_temperature",
      "extract_temperature",
      "exhaust_temperature",
      "heat_recovery",
      "humidity",
      "bypass",
      "mode",
      "level",
      "fan1_rpm",
      "fan2_rpm"
    ];
    const appearance = this._config?.appearance || {};
    const entities = this._config?.entities || {};
    const stateParts = entityKeys.map((key) => {
      const entityId = entities[key] || "";
      const entity = entityId && this._hass ? this._hass.states[entityId] : undefined;
      return [
        key,
        entityId,
        entity?.state ?? "",
        entity?.attributes?.unit_of_measurement ?? "",
        Array.isArray(entity?.attributes?.options) ? entity.attributes.options.join("|") : ""
      ].join(":");
    });

    return JSON.stringify({
      appearance,
      states: stateParts
    });
  }

  _entityId(key) {
    return this._config?.entities?.[key];
  }

  _entity(key) {
    const entityId = this._entityId(key);
    return entityId && this._hass ? this._hass.states[entityId] : undefined;
  }

  _domain(key) {
    return this._entityId(key)?.split(".")[0];
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

  _escapeHtml(value) {
    return value?.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;") || "";
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

  _language() {
    const language = this._hass?.locale?.language || this._hass?.language || "en";
    return language.toString().toLowerCase().startsWith("da") ? "da" : "en";
  }

  _t(key) {
    const translations = {
      en: {
        airflow_diagram: "HRV airflow diagram",
        outdoor: "Outdoor",
        supply: "Supply",
        extract: "Extract",
        exhaust: "Exhaust",
        bypass: "Bypass",
        mode: "Mode",
        level: "Level",
        humidity: "Humidity",
        temperatures: "Temperatures",
        optional_entities: "Optional entities",
        appearance: "Appearance",
        outdoor_temperature: "Outdoor temperature",
        supply_temperature: "Supply temperature",
        extract_temperature: "Extract temperature",
        exhaust_temperature: "Exhaust temperature",
        heat_recovery: "Heat recovery",
        fan1_rpm: "Fan 1 RPM",
        fan2_rpm: "Fan 2 RPM",
        animation: "Animation",
        show_labels: "Show labels",
        show_badges: "Show badges",
        show_temperatures: "Show temperatures",
        compact: "Compact"
      },
      da: {
        airflow_diagram: "HRV luftstrømsdiagram",
        outdoor: "Ude",
        supply: "Indblæsning",
        extract: "Udsugning",
        exhaust: "Afkast",
        bypass: "Bypass",
        mode: "Drift",
        level: "Ventilationstrin",
        humidity: "Fugt",
        temperatures: "Temperaturer",
        optional_entities: "Valgfri enheder",
        appearance: "Udseende",
        outdoor_temperature: "Udetemperatur",
        supply_temperature: "Indblæsningstemperatur",
        extract_temperature: "Udsugningstemperatur",
        exhaust_temperature: "Afkasttemperatur",
        heat_recovery: "Varmegenvinding",
        fan1_rpm: "Ventilator 1 RPM",
        fan2_rpm: "Ventilator 2 RPM",
        animation: "Animation",
        show_labels: "Vis labels",
        show_badges: "Vis badges",
        show_temperatures: "Vis temperaturer",
        compact: "Kompakt"
      }
    };
    return translations[this._language()]?.[key] || translations.en[key] || key;
  }

  _normalizedBypassState() {
    const state = this._state("bypass");
    return state ? state.toString().trim().toLowerCase() : "";
  }

  _isBypassOpen() {
    return ["open", "åben", "aaben", "on", "true", "1", "yes", "ja", "255"].includes(this._normalizedBypassState());
  }

  _isSummerMode() {
    const mode = this._state("mode");
    const normalized = mode ? mode.toString().trim().toLowerCase() : "";
    return normalized.includes("summer") || normalized.includes("sommer");
  }

  _formatBypassState() {
    const value = this._state("bypass");
    if (value === undefined) return "—";
    return value.toString().trim();
  }

  _temperatureColor(value) {
    if (!Number.isFinite(value)) return "var(--secondary-text-color, currentColor)";
    const clamped = Math.max(-10, Math.min(35, value));
    const ratio = (clamped + 10) / 45;
    const hue = 215 - ratio * 205;
    return `hsl(${hue}, 78%, 56%)`;
  }

  _fanLevel() {
    const rawLevel = this._state("level");
    if (rawLevel === undefined) return undefined;
    const numericLevel = Number.parseFloat(rawLevel);
    if (Number.isFinite(numericLevel)) return Math.max(0, Math.min(4, numericLevel));

    const normalized = rawLevel.toString().trim().toLowerCase();
    const embeddedLevel = normalized.match(/\b[0-4]\b/);
    if (embeddedLevel) return Number.parseInt(embeddedLevel[0], 10);

    const levelWords = {
      off: 0,
      fra: 0,
      low: 1,
      lav: 1,
      medium: 2,
      middel: 2,
      normal: 2,
      high: 4,
      høj: 4,
      hoej: 4,
      max: 4
    };
    return levelWords[normalized];
  }

  _flowDuration() {
    if (this._config?.appearance?.animation === false) return "0s";
    const level = this._fanLevel();
    if (level === undefined) return "3.2s";
    if (level <= 0) return "0s";
    const normalized = Math.max(1, Math.min(4, level)) / 4;

    return `${5.1 - normalized * 3.5}s`;
  }

  _gradient(id, from, to, x1 = "0%", y1 = "0%", x2 = "100%", y2 = "0%", gradientUnits = "") {
    const units = gradientUnits ? ` gradientUnits="${gradientUnits}"` : "";
    return `
      <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${units}>
        <stop offset="0%" stop-color="${this._temperatureColor(from)}"></stop>
        <stop offset="52%" stop-color="${this._temperatureColor((Number(from) + Number(to)) / 2)}"></stop>
        <stop offset="100%" stop-color="${this._temperatureColor(to)}"></stop>
      </linearGradient>
    `;
  }

  _airLines(path, duration, stopped, reverse = false) {
    const variants = [
      { offset: -12, width: 2.8, alpha: .84, dash: 30, gap: 104, flowDelay: -.2, waveDelay: -.7, wave: 3.2 },
      { offset: 0, width: 2.2, alpha: .72, dash: 18, gap: 78, flowDelay: -1.35, waveDelay: -2.2, wave: 3.8 },
      { offset: 12, width: 2.4, alpha: .78, dash: 24, gap: 120, flowDelay: -2.1, waveDelay: -1.4, wave: 3.4 }
    ];

    return variants.map((variant) => `
              <g
                class="air-band ${stopped ? "stopped" : ""}"
                style="--air-wave:${variant.wave}px; animation-delay:${variant.waveDelay}s;"
              >
                <path
                  class="air-line ${stopped ? "stopped" : ""}"
                style="--flow-duration:${duration}; --air-alpha:${variant.alpha}; --air-flow-delay:${variant.flowDelay}s; --air-flow-direction:${reverse ? 260 : -260};"
                stroke-width="${variant.width}"
                stroke-dasharray="${variant.dash} ${variant.gap}"
                transform="translate(0 ${variant.offset})"
                d="${path}"
              ></path>
            </g>`).join("");
  }

  _particles(path, duration, stopped, reverse = false) {
    const variants = [
      { offset: -6, width: 3.8, gap: 42, alpha: .82, flowDelay: 0, waveDelay: -.8, wave: 2.2 },
      { offset: 8, width: 4.2, gap: 54, alpha: .72, flowDelay: -1.7, waveDelay: -1.6, wave: 2.6 }
    ];

    return variants.map((variant) => `
          <g
            class="air-band ${stopped ? "stopped" : ""}"
            style="--air-wave:${variant.wave}px; animation-delay:${variant.waveDelay}s;"
          >
            <path
              class="flow-particles ${stopped ? "stopped" : ""}"
              style="--flow-duration:${duration}; --particle-alpha:${variant.alpha}; --air-flow-delay:${variant.flowDelay}s; --air-flow-direction:${reverse ? 260 : -260};"
              stroke-width="${variant.width}"
              stroke-dasharray="1 ${variant.gap}"
              transform="translate(0 ${variant.offset})"
              d="${path}"
            ></path>
          </g>`).join("");
  }

  _badge(label, value, entityKey) {
    const entityId = this._entityId(entityKey);
    const clickable = entityId ? `data-entity="${entityId}"` : "";
    return `
      <button class="badge" ${clickable}>
        <span>${this._escapeHtml(label)}</span>
        <strong>${this._escapeHtml(value)}</strong>
      </button>
    `;
  }

  _selectControl(label, entityKey) {
    const entity = this._entity(entityKey);
    const entityId = this._entityId(entityKey);
    const options = Array.isArray(entity?.attributes?.options) ? entity.attributes.options : [];
    if (!entityId || this._domain(entityKey) !== "select" || options.length === 0) {
      return this._badge(label, this._formatState(entityKey), entityKey);
    }

    return `
      <label class="select-control">
        <span>${this._escapeHtml(label)}</span>
        <select data-select-entity="${this._escapeHtml(entityId)}">
          ${options.map((option) => `
            <option value="${this._escapeHtml(option)}" ${option === entity.state ? "selected" : ""}>${this._escapeHtml(option)}</option>
          `).join("")}
        </select>
      </label>
    `;
  }

  _setSelectOption(entityId, option) {
    this._hass?.callService("select", "select_option", {
      entity_id: entityId,
      option
    });
  }

  _svgEntityAttrs(entityKey) {
    const entityId = this._entityId(entityKey);
    return entityId ? `class="entity-hit" data-entity="${entityId}"` : "";
  }

  _fireMoreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true
    }));
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    this._lastRenderSignature = this._renderSignature();

    const outdoor = this._number("outdoor_temperature");
    const supply = this._number("supply_temperature");
    const extract = this._number("extract_temperature");
    const exhaust = this._number("exhaust_temperature");
    const heatRecovery = this._number("heat_recovery");
    const recoveryProgress = Number.isFinite(heatRecovery) ? Math.max(0, Math.min(100, heatRecovery)) : 0;
    const flowDuration = this._flowDuration();
    const bypassOpen = this._isBypassOpen();
    const summerMode = this._isSummerMode();
    const animationOff = this._config?.appearance?.animation === false;
    const hasBadges = this._config.appearance.show_badges !== false;
    const hasLabels = this._config.appearance.show_labels !== false;
    const hasTemps = this._config.appearance.show_temperatures !== false;
    const compact = this._config.appearance.compact === true;

    const gOutdoorSupply = `${this._id}-outdoor-supply`;
    const gExtractExhaust = `${this._id}-extract-exhaust`;
    const gOutdoorSupplyBypass = `${this._id}-outdoor-supply-bypass`;
    const gExtractExhaustBypass = `${this._id}-extract-exhaust-bypass`;
    const gFlowFade = `${this._id}-flow-fade`;
    const flowMask = `${this._id}-flow-mask`;
    const outdoorSupplyPath = summerMode
      ? ""
      : bypassOpen
      ? "M56 100 H564"
      : "M56 92 H192 C246 92 256 138 310 138 C364 138 374 184 428 184 H564";
    const extractExhaustPath = summerMode
      ? "M564 128 H428 C374 128 364 184 310 184 C256 184 246 184 192 184 H56"
      : bypassOpen
      ? "M564 184 H56"
      : "M564 92 H428 C374 92 364 138 310 138 C256 138 246 184 192 184 H56";
    const rightTopKey = bypassOpen ? "supply_temperature" : "extract_temperature";
    const rightTopLabel = bypassOpen ? this._t("supply") : this._t("extract");
    const rightBottomKey = bypassOpen ? "extract_temperature" : "supply_temperature";
    const rightBottomLabel = bypassOpen ? this._t("extract") : this._t("supply");
    const supplyFlowMarkup = summerMode ? "" : `
              <path class="duct-bg" d="${outdoorSupplyPath}"></path>
              <path class="flow-glow" stroke="url(#${bypassOpen ? gOutdoorSupplyBypass : gOutdoorSupply})" d="${outdoorSupplyPath}"></path>
              <path class="flow" stroke="url(#${bypassOpen ? gOutdoorSupplyBypass : gOutdoorSupply})" d="${outdoorSupplyPath}"></path>
              ${this._airLines(outdoorSupplyPath, flowDuration, flowDuration === "0s")}
              ${this._particles(outdoorSupplyPath, flowDuration, flowDuration === "0s")}
    `;
    const extractFlowMarkup = `
              <path class="duct-bg" d="${extractExhaustPath}"></path>
              <path class="flow-glow" stroke="url(#${bypassOpen ? gExtractExhaustBypass : gExtractExhaust})" d="${extractExhaustPath}"></path>
              <path class="flow" stroke="url(#${bypassOpen ? gExtractExhaustBypass : gExtractExhaust})" d="${extractExhaustPath}"></path>
              ${this._airLines(extractExhaustPath, flowDuration, flowDuration === "0s", true)}
              ${this._particles(extractExhaustPath, flowDuration, flowDuration === "0s", true)}
    `;
    const arrowsMarkup = summerMode ? `
              <path d="M524 122 H501 V115 L486 128 L501 141 V134 H524 Z"></path>
              <path d="M134 178 H111 V171 L96 184 L111 197 V190 H134 Z"></path>
    ` : `
              <path d="${bypassOpen ? "M96 94 H119 V87 L134 100 L119 113 V106 H96 Z" : "M96 86 H119 V79 L134 92 L119 105 V98 H96 Z"}"></path>
              <path d="${bypassOpen ? "M486 94 H509 V87 L524 100 L509 113 V106 H486 Z" : "M524 86 H501 V79 L486 92 L501 105 V98 H524 Z"}"></path>
              <path d="${bypassOpen ? "M524 178 H501 V171 L486 184 L501 197 V190 H524 Z" : "M134 178 H111 V171 L96 184 L111 197 V190 H134 Z"}"></path>
              <path d="${bypassOpen ? "M134 178 H111 V171 L96 184 L111 197 V190 H134 Z" : "M486 178 H509 V171 L524 184 L509 197 V190 H486 Z"}"></path>
    `;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --hrv-flow-width: 46;
          --hrv-background: var(--hrv-card-background, var(--ha-card-background, var(--card-background-color, var(--paper-card-background-color, var(--primary-background-color, #1c1c1c)))));
          --hrv-text: var(--hrv-card-text-color, var(--primary-text-color, var(--text-primary-color, currentColor)));
          --hrv-muted: var(--hrv-card-secondary-text-color, var(--secondary-text-color, var(--hrv-text)));
          --hrv-flow-detail: var(--hrv-card-flow-detail-color, rgba(255, 255, 255, .96));
          --hrv-radius: var(--ha-card-border-radius, 12px);
        }

        ha-card {
          display: block;
          overflow: hidden;
          border-radius: var(--hrv-radius);
          background: var(--hrv-background) !important;
          box-shadow: var(--ha-card-box-shadow, none);
          border: 0;
        }

        .card {
          padding: ${compact ? "6px" : "10px"};
          border-radius: var(--hrv-radius);
          background:
            radial-gradient(circle at 16% 28%, color-mix(in srgb, #25a8ff 18%, transparent), transparent 34%),
            radial-gradient(circle at 84% 32%, color-mix(in srgb, #ff5a4f 16%, transparent), transparent 34%),
            transparent;
          box-shadow: none;
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
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .flow {
          fill: none;
          stroke-width: var(--hrv-flow-width);
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: .7;
        }

        .flow-glow {
          fill: none;
          stroke-width: calc(var(--hrv-flow-width) + 14px);
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: .12;
        }

        .air-band {
          animation: air-wave 5.4s ease-in-out infinite alternate;
          transform-box: fill-box;
          transform-origin: center;
        }

        .air-band.stopped {
          animation: none;
          opacity: .18;
        }

        .air-line {
          fill: none;
          stroke: var(--hrv-flow-detail);
          stroke-linecap: round;
          opacity: var(--air-alpha, .72);
          animation: airflow var(--flow-duration, 3.6s) linear infinite;
          animation-delay: var(--air-flow-delay, 0s);
        }

        .air-line.stopped {
          animation: none;
          opacity: .16;
        }

        .flow-particles {
          fill: none;
          stroke: var(--hrv-flow-detail);
          stroke-linecap: round;
          opacity: var(--particle-alpha, .72);
          animation: airflow var(--flow-duration, 3.6s) linear infinite;
          animation-delay: var(--air-flow-delay, 0s);
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

        @keyframes airflow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: var(--air-flow-direction, -260); }
        }

        @keyframes air-wave {
          from { transform: translateY(calc(var(--air-wave, 2px) * -1)); }
          to { transform: translateY(var(--air-wave, 2px)); }
        }

        .label {
          font-size: 13px;
          fill: var(--hrv-muted) !important;
          color: var(--hrv-muted) !important;
        }

        .temperature {
          font-size: 20px;
          font-weight: 600;
          fill: var(--hrv-text) !important;
          color: var(--hrv-text) !important;
        }

        .side-value {
          font-size: 11px;
          font-weight: 500;
          fill: var(--hrv-text);
        }

        .rpm-inline {
          font-size: 11px;
          font-style: italic;
          font-weight: 500;
          fill: var(--hrv-muted) !important;
          color: var(--hrv-muted) !important;
        }

        .recovery-circle {
          fill: color-mix(in srgb, var(--hrv-background) 82%, transparent);
          stroke: color-mix(in srgb, var(--hrv-text) 18%, transparent);
          stroke-width: 1;
        }

        .recovery-ring-bg {
          fill: none;
          stroke: color-mix(in srgb, var(--hrv-text) 18%, transparent);
          stroke-width: 3;
        }

        .recovery-ring {
          fill: none;
          stroke: color-mix(in srgb, var(--success-color, #43e683) 82%, var(--hrv-text) 18%);
          stroke-width: 3;
          stroke-linecap: round;
        }

        .recovery-value {
          font-size: 17px;
          font-weight: 700;
          fill: var(--hrv-text) !important;
          color: var(--hrv-text) !important;
        }

        .status-circle {
          fill: color-mix(in srgb, var(--hrv-background) 82%, transparent);
          stroke: color-mix(in srgb, var(--hrv-text) 18%, transparent);
          stroke-width: 1;
        }

        .status-label {
          font-size: 8px;
          letter-spacing: 0;
          text-transform: uppercase;
          fill: var(--hrv-muted) !important;
          color: var(--hrv-muted) !important;
        }

        .status-value {
          font-size: 12px;
          font-weight: 700;
          fill: var(--hrv-text) !important;
          color: var(--hrv-text) !important;
        }

        .badges {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(82px, 1fr));
          gap: 6px;
          margin-top: 6px;
        }

        .badge {
          appearance: none;
          border: 0;
          border-radius: 8px;
          background: color-mix(in srgb, var(--hrv-background) 82%, transparent);
          color: var(--hrv-text) !important;
          padding: 6px 8px;
          text-align: left;
          min-width: 0;
          cursor: pointer;
          font: inherit;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hrv-text) 10%, transparent);
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

        .select-control {
          display: block;
          min-width: 0;
          border-radius: 8px;
          background: color-mix(in srgb, var(--hrv-background) 82%, transparent);
          color: var(--hrv-text) !important;
          padding: 6px 8px;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hrv-text) 10%, transparent);
        }

        .select-control span {
          display: block;
          color: var(--hrv-muted) !important;
          font-size: 10px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .select-control select {
          width: 100%;
          margin-top: 2px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--hrv-text) !important;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          min-height: 22px;
          padding: 0;
        }
      </style>

      <ha-card>
        <div class="card ${animationOff ? "no-animation" : ""}">
          <svg viewBox="0 0 620 270" role="img" aria-label="${this._t("airflow_diagram")}">
            <defs>
              ${this._gradient(gOutdoorSupply, outdoor, supply)}
              ${this._gradient(gExtractExhaust, exhaust, extract)}
              ${this._gradient(gOutdoorSupplyBypass, outdoor, supply, "56", "100", "564", "100", "userSpaceOnUse")}
              ${this._gradient(gExtractExhaustBypass, exhaust, extract, "56", "184", "564", "184", "userSpaceOnUse")}
              <linearGradient id="${gFlowFade}" x1="36" y1="0" x2="584" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="black"></stop>
                <stop offset="4%" stop-color="white"></stop>
                <stop offset="96%" stop-color="white"></stop>
                <stop offset="100%" stop-color="black"></stop>
              </linearGradient>
              <mask id="${flowMask}" maskUnits="userSpaceOnUse" x="36" y="58" width="548" height="160">
                <rect x="36" y="58" width="548" height="160" fill="url(#${gFlowFade})"></rect>
              </mask>
            </defs>

            <g mask="url(#${flowMask})">
              ${supplyFlowMarkup}
              ${extractFlowMarkup}
            </g>

            <g fill="var(--hrv-text)" opacity=".92">
              ${arrowsMarkup}
            </g>

            <g ${this._svgEntityAttrs("fan1_rpm")} tabindex="0">
              <rect x="118" y="31" width="98" height="20" rx="8" fill="transparent"></rect>
              <text x="167" y="44" text-anchor="middle" class="rpm-inline">${this._formatRpm("fan1_rpm")}</text>
            </g>
            <g ${this._svgEntityAttrs("fan2_rpm")} tabindex="0">
              <rect x="118" y="219" width="98" height="20" rx="8" fill="transparent"></rect>
              <text x="167" y="232" text-anchor="middle" class="rpm-inline">${this._formatRpm("fan2_rpm")}</text>
            </g>

            <g ${this._svgEntityAttrs("outdoor_temperature")} tabindex="0">
              <rect x="18" y="8" width="100" height="56" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="68" y="28" text-anchor="middle" class="label">${this._t("outdoor")}</text>` : ""}
              ${hasTemps ? `<text x="68" y="54" text-anchor="middle" class="temperature">${this._formatTemp("outdoor_temperature")}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs(rightTopKey)} tabindex="0">
              <rect x="502" y="8" width="100" height="56" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="552" y="28" text-anchor="middle" class="label">${rightTopLabel}</text>` : ""}
              ${hasTemps ? `<text x="552" y="54" text-anchor="middle" class="temperature">${this._formatTemp(rightTopKey)}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs(rightBottomKey)} tabindex="0">
              <rect x="502" y="198" width="100" height="52" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="552" y="218" text-anchor="middle" class="label">${rightBottomLabel}</text>` : ""}
              ${hasTemps ? `<text x="552" y="244" text-anchor="middle" class="temperature">${this._formatTemp(rightBottomKey)}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs("exhaust_temperature")} tabindex="0">
              <rect x="18" y="198" width="100" height="52" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="68" y="218" text-anchor="middle" class="label">${this._t("exhaust")}</text>` : ""}
              ${hasTemps ? `<text x="68" y="244" text-anchor="middle" class="temperature">${this._formatTemp("exhaust_temperature")}</text>` : ""}
            </g>

            ${bypassOpen || summerMode ? "" : `
              <g ${this._svgEntityAttrs("heat_recovery")} tabindex="0" transform="translate(310 46)">
                <circle class="recovery-circle" cx="0" cy="0" r="32"></circle>
                <circle class="recovery-ring-bg" cx="0" cy="0" r="26"></circle>
                <circle class="recovery-ring" cx="0" cy="0" r="26" pathLength="100" stroke-dasharray="${recoveryProgress} 100" transform="rotate(-90 0 0)"></circle>
                <text x="0" y="6" text-anchor="middle" class="recovery-value">${this._formatNumber("heat_recovery", 0, "%")}</text>
              </g>
            `}

            <g ${this._svgEntityAttrs("bypass")} tabindex="0" transform="translate(310 236)">
              <circle class="status-circle" cx="0" cy="0" r="30"></circle>
              <text x="0" y="-5" text-anchor="middle" class="status-label">${this._t("bypass")}</text>
              <text x="0" y="11" text-anchor="middle" class="status-value">${this._formatBypassState()}</text>
            </g>
          </svg>

          ${hasBadges ? `
            <div class="badges">
              ${this._selectControl(this._t("mode"), "mode")}
              ${this._selectControl(this._t("level"), "level")}
              ${this._badge(this._t("humidity"), this._formatNumber("humidity", 0, "%"), "humidity")}
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
    this.shadowRoot.querySelectorAll("[data-select-entity]").forEach((element) => {
      element.addEventListener("change", (event) => {
        this._setSelectOption(element.dataset.selectEntity, event.target.value);
      });
    });
  }
}

class HRVCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._schemaCache = undefined;
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _formData() {
    const entities = this._config?.entities || {};
    const appearance = this._config?.appearance || {};
    return {
      outdoor_temperature: entities.outdoor_temperature,
      supply_temperature: entities.supply_temperature,
      extract_temperature: entities.extract_temperature,
      exhaust_temperature: entities.exhaust_temperature,
      heat_recovery: entities.heat_recovery,
      humidity: entities.humidity,
      bypass: entities.bypass,
      mode: entities.mode,
      level: entities.level,
      fan1_rpm: entities.fan1_rpm,
      fan2_rpm: entities.fan2_rpm,
      animation: appearance.animation !== false,
      show_labels: appearance.show_labels !== false,
      show_badges: appearance.show_badges !== false,
      show_temperatures: appearance.show_temperatures !== false,
      compact: appearance.compact === true
    };
  }

  _language() {
    const language = this._hass?.locale?.language || this._hass?.language || "en";
    return language.toString().toLowerCase().startsWith("da") ? "da" : "en";
  }

  _t(key) {
    const translations = {
      en: {
        temperatures: "Temperatures",
        optional_entities: "Optional entities",
        appearance: "Appearance",
        outdoor_temperature: "Outdoor temperature",
        supply_temperature: "Supply temperature",
        extract_temperature: "Extract temperature",
        exhaust_temperature: "Exhaust temperature",
        heat_recovery: "Heat recovery",
        humidity: "Humidity",
        bypass: "Bypass",
        mode: "Mode",
        level: "Level",
        fan1_rpm: "Fan 1 RPM",
        fan2_rpm: "Fan 2 RPM",
        animation: "Animation",
        show_labels: "Show labels",
        show_badges: "Show badges",
        show_temperatures: "Show temperatures",
        compact: "Compact"
      },
      da: {
        temperatures: "Temperaturer",
        optional_entities: "Valgfri enheder",
        appearance: "Udseende",
        outdoor_temperature: "Udetemperatur",
        supply_temperature: "Indblæsningstemperatur",
        extract_temperature: "Udsugningstemperatur",
        exhaust_temperature: "Afkasttemperatur",
        heat_recovery: "Varmegenvinding",
        humidity: "Fugt",
        bypass: "Bypass",
        mode: "Drift",
        level: "Ventilationstrin",
        fan1_rpm: "Ventilator 1 RPM",
        fan2_rpm: "Ventilator 2 RPM",
        animation: "Animation",
        show_labels: "Vis labels",
        show_badges: "Vis badges",
        show_temperatures: "Vis temperaturer",
        compact: "Kompakt"
      }
    };
    return translations[this._language()]?.[key] || translations.en[key] || key;
  }

  _schema() {
    return [
      {
        type: "expandable",
        name: "temperatures",
        title: this._t("temperatures"),
        flatten: true,
        icon: "mdi:thermometer",
        schema: [
          { name: "outdoor_temperature", selector: { entity: { domain: "sensor" } } },
          { name: "supply_temperature", selector: { entity: { domain: "sensor" } } },
          { name: "extract_temperature", selector: { entity: { domain: "sensor" } } },
          { name: "exhaust_temperature", selector: { entity: { domain: "sensor" } } }
        ]
      },
      {
        type: "expandable",
        name: "optional_entities",
        title: this._t("optional_entities"),
        flatten: true,
        icon: "mdi:tune-variant",
        schema: [
          { name: "heat_recovery", selector: { entity: { domain: "sensor" } } },
          { name: "humidity", selector: { entity: { domain: "sensor" } } },
          { name: "bypass", selector: { entity: {} } },
          { name: "mode", selector: { entity: {} } },
          { name: "level", selector: { entity: {} } },
          { name: "fan1_rpm", selector: { entity: { domain: "sensor" } } },
          { name: "fan2_rpm", selector: { entity: { domain: "sensor" } } }
        ]
      },
      {
        type: "expandable",
        name: "appearance",
        title: this._t("appearance"),
        flatten: true,
        icon: "mdi:palette",
        schema: [
          { name: "animation", selector: { boolean: {} } },
          { name: "show_labels", selector: { boolean: {} } },
          { name: "show_badges", selector: { boolean: {} } },
          { name: "show_temperatures", selector: { boolean: {} } },
          { name: "compact", selector: { boolean: {} } }
        ]
      }
    ];
  }

  _computeLabel(schema) {
    return this._t(schema.name) || schema.title || schema.name;
  }

  _valueChanged(event) {
    event.stopPropagation();
    const value = event.detail.value || {};
    const next = structuredClone(this._config || {});
    next.entities = {
      ...(next.entities || {}),
      outdoor_temperature: value.outdoor_temperature || undefined,
      supply_temperature: value.supply_temperature || undefined,
      extract_temperature: value.extract_temperature || undefined,
      exhaust_temperature: value.exhaust_temperature || undefined,
      heat_recovery: value.heat_recovery || undefined,
      humidity: value.humidity || undefined,
      bypass: value.bypass || undefined,
      mode: value.mode || undefined,
      level: value.level || undefined,
      fan1_rpm: value.fan1_rpm || undefined,
      fan2_rpm: value.fan2_rpm || undefined
    };
    next.appearance = {
      ...(next.appearance || {}),
      animation: value.animation !== false,
      show_labels: value.show_labels !== false,
      show_badges: value.show_badges !== false,
      show_temperatures: value.show_temperatures !== false,
      compact: value.compact === true
    };
    Object.keys(next.entities).forEach((key) => {
      if (next.entities[key] === undefined) delete next.entities[key];
    });
    Object.keys(next.appearance).forEach((key) => {
      if (next.appearance[key] === undefined) delete next.appearance[key];
    });
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: next },
      bubbles: true,
      composed: true
    }));
  }

  _render() {
    if (!this.shadowRoot) return;
    let form = this.shadowRoot.querySelector("ha-form");
    if (!form) {
      this.shadowRoot.innerHTML = `
        <style>
          ha-form {
            display: block;
          }
        </style>
        <ha-form></ha-form>
      `;
      form = this.shadowRoot.querySelector("ha-form");
      form.computeLabel = (schema) => this._computeLabel(schema);
      form.addEventListener("value-changed", (event) => this._valueChanged(event));
    }

    const language = this._language();
    if (!this._schemaCache || this._schemaCacheLanguage !== language) {
      this._schemaCache = this._schema();
      this._schemaCacheLanguage = language;
    }
    form.schema = this._schemaCache;
    form.hass = this._hass;
    form.data = this._formData();
  }
}

if (!customElements.get("hrv-card")) {
  customElements.define("hrv-card", HRVCard);
}

if (!customElements.get("hrv-card-editor")) {
  customElements.define("hrv-card-editor", HRVCardEditor);
}

window.customCards = window.customCards || [];

window.customCards.push({
  type: "hrv-card",
  name: "HRV Card",
  description: "Animated heat recovery ventilation card with temperature gradients",
  preview: true
});

window.__HRV_CARD_VERSION__ = "2.1.0";
console.info("%c HRV Card %c loaded v2.1.0 ", "color: white; background: #1976d2; font-weight: 700; padding: 2px 4px; border-radius: 3px 0 0 3px;", "color: white; background: #43a047; font-weight: 700; padding: 2px 4px; border-radius: 0 3px 3px 0;");
