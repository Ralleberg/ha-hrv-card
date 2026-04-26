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
        bypass: findEntity(["bypass"], "sensor.bypass"),
        mode: findEntity(["op_mode", "mode"], "sensor.mode"),
        level: findEntity(["op_mode", "level"], "sensor.dantherm_op_mode"),
        fan1_rpm: findEntity(["fan1_rpm", "fan_1_rpm"], "sensor.dantherm_fan1_rpm"),
        fan2_rpm: findEntity(["fan2_rpm", "fan_2_rpm"], "sensor.dantherm_fan2_rpm")
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

  getGridOptions() {
    return {
      rows: this._config?.appearance?.compact ? 3 : 4,
      columns: 12,
      min_rows: 3
    };
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

  _normalizedBypassState() {
    const state = this._state("bypass");
    return state ? state.toString().trim().toLowerCase() : "";
  }

  _isBypassOpen() {
    return ["open", "åben", "aaben", "on", "true", "1", "yes", "ja", "255"].includes(this._normalizedBypassState());
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

  _airLines(path, duration, stopped) {
    const variants = [
      { offset: -12, width: 2.1, alpha: .48, dash: 24, gap: 122, flowDelay: -.2, waveDelay: -.7, pulseDelay: -1.1, wave: 2.4, pulse: 6.8 },
      { offset: -4, width: 1.7, alpha: .36, dash: 18, gap: 104, flowDelay: -1.35, waveDelay: -2.2, pulseDelay: -3.8, wave: 3.2, pulse: 8.6 },
      { offset: 5, width: 2.0, alpha: .42, dash: 22, gap: 138, flowDelay: -2.1, waveDelay: -1.4, pulseDelay: -5.1, wave: 2.8, pulse: 7.7 },
      { offset: 13, width: 1.4, alpha: .3, dash: 16, gap: 96, flowDelay: -2.85, waveDelay: -3.6, pulseDelay: -2.4, wave: 3.6, pulse: 9.4 }
    ];

    return variants.map((variant) => `
            <g
              class="air-band ${stopped ? "stopped" : ""}"
              style="--air-wave:${variant.wave}px; animation-delay:${variant.waveDelay}s;"
            >
              <path
                class="air-line ${stopped ? "stopped" : ""}"
                style="--flow-duration:${duration}; --air-alpha:${variant.alpha}; --air-pulse-duration:${variant.pulse}s; --air-flow-delay:${variant.flowDelay}s; --air-pulse-delay:${variant.pulseDelay}s;"
                stroke-width="${variant.width}"
                stroke-dasharray="${variant.dash} ${variant.gap}"
                transform="translate(0 ${variant.offset})"
                filter="url(#${this._id}-air-wobble)"
                d="${path}"
              ></path>
            </g>`).join("");
  }

  _particles(path, duration, stopped) {
    const variants = [
      { offset: -8, width: 2.4, gap: 46, alpha: .56, flowDelay: 0, waveDelay: -.8, pulseDelay: -2.3, wave: 1.8, pulse: 7.2 },
      { offset: 0, width: 1.8, gap: 38, alpha: .44, flowDelay: -1.15, waveDelay: -2.8, pulseDelay: -4.6, wave: 2.5, pulse: 8.9 },
      { offset: 9, width: 3.0, gap: 58, alpha: .48, flowDelay: -2.2, waveDelay: -1.6, pulseDelay: -1.5, wave: 2.1, pulse: 7.9 }
    ];

    return variants.map((variant) => `
          <g
            class="air-band ${stopped ? "stopped" : ""}"
            style="--air-wave:${variant.wave}px; animation-delay:${variant.waveDelay}s;"
          >
            <path
              class="flow-particles ${stopped ? "stopped" : ""}"
              style="--flow-duration:${duration}; --particle-alpha:${variant.alpha}; --air-pulse-duration:${variant.pulse}s; --air-flow-delay:${variant.flowDelay}s; --air-pulse-delay:${variant.pulseDelay}s;"
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
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true
    }));
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
    const bypassOpen = this._isBypassOpen();
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
    const outdoorSupplyPath = bypassOpen
      ? "M56 100 H564"
      : "M56 92 H192 C246 92 256 138 310 138 C364 138 374 184 428 184 H564";
    const extractExhaustPath = bypassOpen
      ? "M564 184 H56"
      : "M564 92 H428 C374 92 364 138 310 138 C256 138 246 184 192 184 H56";
    const rightTopKey = bypassOpen ? "supply_temperature" : "extract_temperature";
    const rightTopLabel = bypassOpen ? "Supply" : "Extract";
    const rightBottomKey = bypassOpen ? "extract_temperature" : "supply_temperature";
    const rightBottomLabel = bypassOpen ? "Extract" : "Supply";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --hrv-flow-width: 42;
          --hrv-background: var(--hrv-card-background, var(--ha-card-background, var(--card-background-color, transparent)));
          --hrv-text: var(--hrv-card-text-color, var(--primary-text-color, var(--text-primary-color, currentColor)));
          --hrv-muted: var(--hrv-card-secondary-text-color, var(--secondary-text-color, var(--hrv-text)));
          --hrv-flow-detail: var(--hrv-card-flow-detail-color, var(--secondary-text-color, var(--hrv-text)));
          --hrv-radius: var(--ha-card-border-radius, 12px);
        }

        ha-card {
          overflow: hidden;
          border-radius: var(--hrv-radius);
          background: var(--hrv-background) !important;
          box-shadow: var(--ha-card-box-shadow, none);
          border: var(--ha-card-border-width, 0) solid var(--ha-card-border-color, transparent);
        }

        .card {
          padding: ${compact ? "8px" : "12px"};
          border-radius: var(--hrv-radius);
          background:
            radial-gradient(circle at 16% 28%, color-mix(in srgb, #25a8ff 18%, transparent), transparent 34%),
            radial-gradient(circle at 84% 32%, color-mix(in srgb, #ff5a4f 16%, transparent), transparent 34%),
            transparent;
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
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .flow {
          fill: none;
          stroke-width: var(--hrv-flow-width);
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: .94;
          filter: drop-shadow(0 0 12px color-mix(in srgb, var(--hrv-text) 16%, transparent));
        }

        .flow-glow {
          fill: none;
          stroke-width: calc(var(--hrv-flow-width) + 14px);
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: .28;
          filter: blur(7px);
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
          animation:
            airflow var(--flow-duration, 3.6s) linear infinite,
            air-pulse var(--air-pulse-duration, 7.4s) ease-in-out infinite;
          animation-delay: var(--air-flow-delay, 0s), var(--air-pulse-delay, 0s);
          filter: drop-shadow(0 0 6px color-mix(in srgb, var(--hrv-flow-detail) 28%, transparent));
        }

        .air-line.stopped {
          animation: none;
          opacity: .16;
        }

        .flow-particles {
          fill: none;
          stroke: var(--hrv-flow-detail);
          stroke-linecap: round;
          animation:
            airflow var(--flow-duration, 3.6s) linear infinite,
            air-pulse var(--air-pulse-duration, 7.4s) ease-in-out infinite;
          animation-delay: var(--air-flow-delay, 0s), var(--air-pulse-delay, 0s);
          filter: drop-shadow(0 0 5px color-mix(in srgb, var(--hrv-flow-detail) 32%, transparent));
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
          to { stroke-dashoffset: -260; }
        }

        @keyframes air-wave {
          from { transform: translateY(calc(var(--air-wave, 2px) * -1)); }
          to { transform: translateY(var(--air-wave, 2px)); }
        }

        @keyframes air-pulse {
          0% { opacity: .16; }
          18% { opacity: calc(var(--air-alpha, var(--particle-alpha, .38)) * .48); }
          43% { opacity: var(--air-alpha, var(--particle-alpha, .28)); }
          61% { opacity: calc(var(--air-alpha, var(--particle-alpha, .38)) * .62); }
          78% { opacity: calc(var(--air-alpha, var(--particle-alpha, .38)) * .95); }
          100% { opacity: .18; }
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

        .rpm-inline {
          font-size: 10px;
          font-style: italic;
          font-weight: 500;
          fill: var(--hrv-muted) !important;
          color: var(--hrv-muted) !important;
        }

        .recovery-circle {
          fill: color-mix(in srgb, var(--hrv-background) 82%, transparent);
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
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, .22));
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
          margin-top: 8px;
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
          <svg viewBox="0 0 620 288" role="img" aria-label="HRV airflow diagram">
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
              <filter id="${this._id}-air-wobble" x="-12%" y="-70%" width="124%" height="240%">
                <feTurbulence type="fractalNoise" baseFrequency="0.018 0.09" numOctaves="1" seed="8" result="airNoise">
                  <animate attributeName="baseFrequency" values="0.014 0.075;0.022 0.11;0.017 0.085" dur="7.6s" repeatCount="indefinite"></animate>
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="airNoise" scale="3" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
              </filter>
            </defs>

            <g mask="url(#${flowMask})">
              <path class="duct-bg" d="${outdoorSupplyPath}"></path>
              <path class="duct-bg" d="${extractExhaustPath}"></path>

              <path class="flow-glow" stroke="url(#${bypassOpen ? gOutdoorSupplyBypass : gOutdoorSupply})" d="${outdoorSupplyPath}"></path>
              <path class="flow-glow" stroke="url(#${bypassOpen ? gExtractExhaustBypass : gExtractExhaust})" d="${extractExhaustPath}"></path>
              <path class="flow" stroke="url(#${bypassOpen ? gOutdoorSupplyBypass : gOutdoorSupply})" d="${outdoorSupplyPath}"></path>
              <path class="flow" stroke="url(#${bypassOpen ? gExtractExhaustBypass : gExtractExhaust})" d="${extractExhaustPath}"></path>
              ${this._airLines(outdoorSupplyPath, fan1Duration, fan1Duration === "0s")}
              ${this._airLines(extractExhaustPath, fan2Duration, fan2Duration === "0s")}
              ${this._particles(outdoorSupplyPath, fan1Duration, fan1Duration === "0s")}
              ${this._particles(extractExhaustPath, fan2Duration, fan2Duration === "0s")}
            </g>

            <g fill="var(--hrv-text)" opacity=".92">
              <path d="${bypassOpen ? "M96 94 H119 V87 L134 100 L119 113 V106 H96 Z" : "M96 86 H119 V79 L134 92 L119 105 V98 H96 Z"}"></path>
              <path d="${bypassOpen ? "M486 94 H509 V87 L524 100 L509 113 V106 H486 Z" : "M524 86 H501 V79 L486 92 L501 105 V98 H524 Z"}"></path>
              <path d="${bypassOpen ? "M524 178 H501 V171 L486 184 L501 197 V190 H524 Z" : "M134 178 H111 V171 L96 184 L111 197 V190 H134 Z"}"></path>
              <path d="${bypassOpen ? "M134 178 H111 V171 L96 184 L111 197 V190 H134 Z" : "M486 178 H509 V171 L524 184 L509 197 V190 H486 Z"}"></path>
            </g>

            <g ${this._svgEntityAttrs("fan1_rpm")} tabindex="0">
              <rect x="126" y="68" width="96" height="18" rx="8" fill="transparent"></rect>
              <text x="174" y="80" text-anchor="middle" class="rpm-inline">${this._formatRpm("fan1_rpm")}</text>
            </g>
            <g ${this._svgEntityAttrs("fan2_rpm")} tabindex="0">
              <rect x="126" y="216" width="96" height="18" rx="8" fill="transparent"></rect>
              <text x="174" y="228" text-anchor="middle" class="rpm-inline">${this._formatRpm("fan2_rpm")}</text>
            </g>

            <g ${this._svgEntityAttrs("outdoor_temperature")} tabindex="0">
              <rect x="18" y="8" width="100" height="56" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="68" y="28" text-anchor="middle" class="label">Outdoor</text>` : ""}
              ${hasTemps ? `<text x="68" y="54" text-anchor="middle" class="temperature">${this._formatTemp("outdoor_temperature")}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs(rightTopKey)} tabindex="0">
              <rect x="502" y="8" width="100" height="56" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="552" y="28" text-anchor="middle" class="label">${rightTopLabel}</text>` : ""}
              ${hasTemps ? `<text x="552" y="54" text-anchor="middle" class="temperature">${this._formatTemp(rightTopKey)}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs(rightBottomKey)} tabindex="0">
              <rect x="502" y="206" width="100" height="52" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="552" y="226" text-anchor="middle" class="label">${rightBottomLabel}</text>` : ""}
              ${hasTemps ? `<text x="552" y="252" text-anchor="middle" class="temperature">${this._formatTemp(rightBottomKey)}</text>` : ""}
            </g>
            <g ${this._svgEntityAttrs("exhaust_temperature")} tabindex="0">
              <rect x="18" y="206" width="100" height="52" rx="10" fill="transparent"></rect>
              ${hasLabels ? `<text x="68" y="226" text-anchor="middle" class="label">Exhaust</text>` : ""}
              ${hasTemps ? `<text x="68" y="252" text-anchor="middle" class="temperature">${this._formatTemp("exhaust_temperature")}</text>` : ""}
            </g>

            ${bypassOpen ? "" : `
              <g ${this._svgEntityAttrs("heat_recovery")} tabindex="0" transform="translate(310 46)">
                <circle class="recovery-circle" cx="0" cy="0" r="32"></circle>
                <circle class="recovery-ring-bg" cx="0" cy="0" r="26"></circle>
                <circle class="recovery-ring" cx="0" cy="0" r="26" pathLength="100" stroke-dasharray="${recoveryProgress} 100" transform="rotate(-90 0 0)"></circle>
                <text x="0" y="6" text-anchor="middle" class="recovery-value">${this._formatNumber("heat_recovery", 0, "%")}</text>
              </g>
            `}

            <g ${this._svgEntityAttrs("bypass")} tabindex="0" transform="translate(310 245)">
              <circle class="status-circle" cx="0" cy="0" r="30"></circle>
              <text x="0" y="-5" text-anchor="middle" class="status-label">Bypass</text>
              <text x="0" y="11" text-anchor="middle" class="status-value">${this._formatBypassState()}</text>
            </g>
          </svg>

          ${hasBadges ? `
            <div class="badges">
              ${this._badge("Mode", this._formatState("mode"), "mode")}
              ${this._badge("Level", this._formatState("level"), "level")}
              ${this._badge("Humidity", this._formatNumber("humidity", 0, "%"), "humidity")}
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
      compact: appearance.compact === true,
      max_rpm: appearance.max_rpm
    };
  }

  _schema() {
    return [
      {
        type: "expandable",
        name: "temperatures",
        title: "Temperatures",
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
        title: "Optional entities",
        flatten: true,
        icon: "mdi:tune-variant",
        schema: [
          { name: "heat_recovery", selector: { entity: { domain: "sensor" } } },
          { name: "humidity", selector: { entity: { domain: "sensor" } } },
          { name: "bypass", selector: { entity: {} } },
          { name: "mode", selector: { entity: {} } },
          { name: "level", selector: { entity: { domain: "sensor" } } },
          { name: "fan1_rpm", selector: { entity: { domain: "sensor" } } },
          { name: "fan2_rpm", selector: { entity: { domain: "sensor" } } }
        ]
      },
      {
        type: "expandable",
        name: "appearance",
        title: "Appearance",
        flatten: true,
        icon: "mdi:palette",
        schema: [
          { name: "animation", selector: { boolean: {} } },
          { name: "show_labels", selector: { boolean: {} } },
          { name: "show_badges", selector: { boolean: {} } },
          { name: "show_temperatures", selector: { boolean: {} } },
          { name: "compact", selector: { boolean: {} } },
          { name: "max_rpm", selector: { number: { min: 100, max: 10000, step: 100, mode: "box", unit_of_measurement: "rpm" } } }
        ]
      }
    ];
  }

  _computeLabel(schema) {
    const labels = {
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
      compact: "Compact",
      max_rpm: "Max RPM"
    };
    return labels[schema.name] || schema.title || schema.name;
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
      compact: value.compact === true,
      max_rpm: value.max_rpm || undefined
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
    this.shadowRoot.innerHTML = `
      <style>
        ha-form {
          display: block;
        }
      </style>
      <ha-form></ha-form>
    `;

    const form = this.shadowRoot.querySelector("ha-form");
    form.hass = this._hass;
    form.data = this._formData();
    form.schema = this._schema();
    form.computeLabel = this._computeLabel;
    form.addEventListener("value-changed", (event) => this._valueChanged(event));
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

window.__HRV_CARD_VERSION__ = "1.0.8b";
console.info("%c HRV Card %c loaded v1.0.8b ", "color: white; background: #1976d2; font-weight: 700; padding: 2px 4px; border-radius: 3px 0 0 3px;", "color: white; background: #43a047; font-weight: 700; padding: 2px 4px; border-radius: 0 3px 3px 0;");
