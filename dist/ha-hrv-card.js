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

  _rpm(key) {
    const value = this._number(key);
    return Number.isFinite(value) ? value : undefined;
  }

  _rpmPercent(key) {
    const rpm = this._rpm(key);
    if (!Number.isFinite(rpm)) return 0;
    return Math.max(0, Math.min(100, (rpm / 3000) * 100));
  }

  _flowDuration(key) {
    if (this._config?.appearance?.animation === false) return "0s";
    const rpm = this._rpm(key);
    if (!Number.isFinite(rpm)) return this._animationDuration();
    const normalized = Math.max(0, Math.min(3000, rpm)) / 3000;
    return `${5.4 - normalized * 3.1}s`;
  }

  _particleCount(key) {
    const rpm = this._rpm(key);
    if (!Number.isFinite(rpm)) return 3;
    if (rpm < 500) return 2;
    if (rpm < 1200) return 3;
    if (rpm < 1800) return 4;
    if (rpm < 2300) return 5;
    return 6;
  }

  _particleGroup(pathId, color, duration, count, seed = 0) {
    if (duration === "0s") return "";
    const particles = [];
    const sizes = [2.7, 1.9, 2.3, 1.6, 2.1, 1.4];
    for (let index = 0; index < count; index += 1) {
      const size = sizes[index % sizes.length];
      const soft = index % 2 === 1 ? " soft" : "";
      const delay = -((index * 0.72) + seed).toFixed(2);
      const opacityPeak = index % 2 === 1 ? ".58" : ".88";
      particles.push(`
              <circle r="${size}" class="particle${soft}" style="--particle-color:${color}">
                <animateMotion dur="${duration}" begin="${delay}s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1"><mpath href="#${pathId}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="${duration}" begin="${delay}s" repeatCount="indefinite" values="0;${opacityPeak};.45;0" keyTimes="0;.18;.76;1"></animate>
                <animate attributeName="r" dur="${duration}" begin="${delay}s" repeatCount="indefinite" values="${Math.max(1, size - 1)};${size + .45};${size};${Math.max(.8, size - 1.2)}" keyTimes="0;.25;.72;1"></animate>
              </circle>`);
    }
    return particles.join("");
  }

  _fanGauge(label, key) {
    const rpm = this._rpm(key);
    const percent = this._rpmPercent(key);
    const value = Number.isFinite(rpm) ? `${Math.round(rpm)}` : "—";
    return `
      <div class="fan-gauge" style="--fan-percent:${percent}%">
        <div class="fan-label">${label}</div>
        <div class="fan-ring">
          <div class="fan-center">
            <strong>${value}</strong>
            <span>RPM</span>
          </div>
        </div>
      </div>
    `;
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
          background: var(--ha-card-background, var(--card-background-color));
          box-shadow: var(--ha-card-box-shadow, none);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
        }

        .card {
          position: relative;
          padding: ${compact ? "12px" : "16px"};
          background:
            radial-gradient(circle at 18% 35%, color-mix(in srgb, var(--info-color, #039be5) 10%, transparent), transparent 34%),
            radial-gradient(circle at 82% 42%, color-mix(in srgb, var(--error-color, #db4437) 9%, transparent), transparent 36%);
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
          stroke: color-mix(in srgb, var(--primary-text-color) 9%, transparent);
          stroke-width: calc(var(--hrv-flow-width) + 6px);
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
          opacity: 0;
          filter: drop-shadow(0 0 5px currentColor);
          transform-box: fill-box;
          transform-origin: center;
        }

        .particle.soft {
          opacity: 0;
          filter: blur(.2px) drop-shadow(0 0 7px currentColor);
        }

        .no-animation .particle {
          display: none;
        }

        .core {
          fill: url(#${this._id}-core-gradient);
          stroke: color-mix(in srgb, var(--primary-text-color) 16%, transparent);
          stroke-width: 1.3;
          filter: drop-shadow(0 4px 10px color-mix(in srgb, black 18%, transparent));
        }

        .core-line {
          stroke: color-mix(in srgb, var(--primary-text-color) 22%, transparent);
          stroke-width: 1.4;
          stroke-linecap: round;
        }

        .core-plate {
          fill: none;
          stroke: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
          stroke-width: .9;
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
          border: 1px solid color-mix(in srgb, var(--primary-text-color) 7%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--card-background-color) 72%, transparent);
          color: var(--primary-text-color);
          padding: 9px 10px;
          text-align: left;
          min-width: 0;
          cursor: pointer;
          font: inherit;
          backdrop-filter: blur(8px);
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
              <linearGradient id="${this._id}-core-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="color-mix(in srgb, var(--card-background-color) 96%, white 4%)"></stop>
                <stop offset="100%" stop-color="color-mix(in srgb, var(--card-background-color) 78%, var(--primary-text-color) 6%)"></stop>
              </linearGradient>
            </defs>

            <path id="${pOutdoorCore}" class="duct-bg" d="M55 192 C150 192 198 184 264 162"></path>
            <path id="${pSupplyExit}" class="duct-bg" d="M356 118 C422 96 470 88 565 88"></path>
            <path id="${pExtractCore}" class="duct-bg" d="M565 192 C470 192 422 184 356 162"></path>
            <path id="${pCoreExhaust}" class="duct-bg" d="M264 118 C198 96 150 88 55 88"></path>

            <!-- Fresh air: Outdoor bottom-left -> HRV -> Supply top-right -->
            <path class="flow" stroke="url(#${gOutdoorSupply})" d="M55 192 C150 192 198 184 264 162"></path>
            <path class="flow" stroke="url(#${gOutdoorSupply})" d="M356 118 C422 96 470 88 565 88"></path>

            <!-- Stale air: Extract bottom-right -> HRV -> Exhaust top-left -->
            <path class="flow" stroke="url(#${gExtractExhaust})" d="M565 192 C470 192 422 184 356 162"></path>
            <path class="flow" stroke="url(#${gExtractExhaust})" d="M264 118 C198 96 150 88 55 88"></path>

            <g class="particles">
              <circle r="2.7" class="particle" style="--particle-color:${this._particleColor(outdoor)}">
                <animateMotion dur="${duration}" begin="-.15s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1"><mpath href="#${pOutdoorCore}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="${duration}" begin="-.15s" repeatCount="indefinite" values="0;.92;.72;0" keyTimes="0;.18;.78;1"></animate>
                <animate attributeName="r" dur="${duration}" begin="-.15s" repeatCount="indefinite" values="1.7;3.0;2.2;1.2" keyTimes="0;.25;.72;1"></animate>
              </circle>
              <circle r="1.8" class="particle soft" style="--particle-color:${this._particleColor(outdoor)}">
                <animateMotion dur="calc(${duration} * 1.17)" begin="-1.05s" repeatCount="indefinite" calcMode="spline" keySplines=".37 0 .63 1"><mpath href="#${pOutdoorCore}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * 1.17)" begin="-1.05s" repeatCount="indefinite" values="0;.58;.46;0" keyTimes="0;.22;.76;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * 1.17)" begin="-1.05s" repeatCount="indefinite" values="1.1;2.2;1.7;1.0" keyTimes="0;.28;.74;1"></animate>
              </circle>
              <circle r="2.2" class="particle" style="--particle-color:${this._particleColor(outdoor)}">
                <animateMotion dur="calc(${duration} * .91)" begin="-2.2s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1"><mpath href="#${pOutdoorCore}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * .91)" begin="-2.2s" repeatCount="indefinite" values="0;.8;.65;0" keyTimes="0;.16;.8;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * .91)" begin="-2.2s" repeatCount="indefinite" values="1.3;2.6;2.0;1.1" keyTimes="0;.24;.76;1"></animate>
              </circle>

              <circle r="2.7" class="particle" style="--particle-color:${this._particleColor(supply)}">
                <animateMotion dur="calc(${duration} * 1.04)" begin="-.55s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1"><mpath href="#${pSupplyExit}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * 1.04)" begin="-.55s" repeatCount="indefinite" values="0;.92;.72;0" keyTimes="0;.18;.78;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * 1.04)" begin="-.55s" repeatCount="indefinite" values="1.7;3.0;2.2;1.2" keyTimes="0;.25;.72;1"></animate>
              </circle>
              <circle r="1.8" class="particle soft" style="--particle-color:${this._particleColor(supply)}">
                <animateMotion dur="calc(${duration} * .88)" begin="-1.65s" repeatCount="indefinite" calcMode="spline" keySplines=".37 0 .63 1"><mpath href="#${pSupplyExit}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * .88)" begin="-1.65s" repeatCount="indefinite" values="0;.58;.46;0" keyTimes="0;.22;.76;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * .88)" begin="-1.65s" repeatCount="indefinite" values="1.1;2.2;1.7;1.0" keyTimes="0;.28;.74;1"></animate>
              </circle>
              <circle r="2.2" class="particle" style="--particle-color:${this._particleColor(supply)}">
                <animateMotion dur="calc(${duration} * 1.23)" begin="-2.75s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1"><mpath href="#${pSupplyExit}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * 1.23)" begin="-2.75s" repeatCount="indefinite" values="0;.8;.65;0" keyTimes="0;.16;.8;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * 1.23)" begin="-2.75s" repeatCount="indefinite" values="1.3;2.6;2.0;1.1" keyTimes="0;.24;.76;1"></animate>
              </circle>

              <circle r="2.7" class="particle" style="--particle-color:${this._particleColor(extract)}">
                <animateMotion dur="calc(${duration} * .97)" begin="-.35s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1"><mpath href="#${pExtractCore}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * .97)" begin="-.35s" repeatCount="indefinite" values="0;.92;.72;0" keyTimes="0;.18;.78;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * .97)" begin="-.35s" repeatCount="indefinite" values="1.7;3.0;2.2;1.2" keyTimes="0;.25;.72;1"></animate>
              </circle>
              <circle r="1.8" class="particle soft" style="--particle-color:${this._particleColor(extract)}">
                <animateMotion dur="calc(${duration} * 1.13)" begin="-1.45s" repeatCount="indefinite" calcMode="spline" keySplines=".37 0 .63 1"><mpath href="#${pExtractCore}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * 1.13)" begin="-1.45s" repeatCount="indefinite" values="0;.58;.46;0" keyTimes="0;.22;.76;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * 1.13)" begin="-1.45s" repeatCount="indefinite" values="1.1;2.2;1.7;1.0" keyTimes="0;.28;.74;1"></animate>
              </circle>
              <circle r="2.2" class="particle" style="--particle-color:${this._particleColor(extract)}">
                <animateMotion dur="calc(${duration} * .84)" begin="-2.55s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1"><mpath href="#${pExtractCore}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * .84)" begin="-2.55s" repeatCount="indefinite" values="0;.8;.65;0" keyTimes="0;.16;.8;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * .84)" begin="-2.55s" repeatCount="indefinite" values="1.3;2.6;2.0;1.1" keyTimes="0;.24;.76;1"></animate>
              </circle>

              <circle r="2.7" class="particle" style="--particle-color:${this._particleColor(exhaust)}">
                <animateMotion dur="calc(${duration} * 1.08)" begin="-.8s" repeatCount="indefinite" calcMode="spline" keySplines=".42 0 .58 1"><mpath href="#${pCoreExhaust}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * 1.08)" begin="-.8s" repeatCount="indefinite" values="0;.92;.72;0" keyTimes="0;.18;.78;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * 1.08)" begin="-.8s" repeatCount="indefinite" values="1.7;3.0;2.2;1.2" keyTimes="0;.25;.72;1"></animate>
              </circle>
              <circle r="1.8" class="particle soft" style="--particle-color:${this._particleColor(exhaust)}">
                <animateMotion dur="calc(${duration} * .93)" begin="-1.9s" repeatCount="indefinite" calcMode="spline" keySplines=".37 0 .63 1"><mpath href="#${pCoreExhaust}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * .93)" begin="-1.9s" repeatCount="indefinite" values="0;.58;.46;0" keyTimes="0;.22;.76;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * .93)" begin="-1.9s" repeatCount="indefinite" values="1.1;2.2;1.7;1.0" keyTimes="0;.28;.74;1"></animate>
              </circle>
              <circle r="2.2" class="particle" style="--particle-color:${this._particleColor(exhaust)}">
                <animateMotion dur="calc(${duration} * 1.29)" begin="-3.0s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1"><mpath href="#${pCoreExhaust}"></mpath></animateMotion>
                <animate attributeName="opacity" dur="calc(${duration} * 1.29)" begin="-3.0s" repeatCount="indefinite" values="0;.8;.65;0" keyTimes="0;.16;.8;1"></animate>
                <animate attributeName="r" dur="calc(${duration} * 1.29)" begin="-3.0s" repeatCount="indefinite" values="1.3;2.6;2.0;1.1" keyTimes="0;.24;.76;1"></animate>
              </circle>
            </g>

            <rect class="core" x="270" y="94" width="80" height="92" rx="16"></rect>
            <path class="core-plate" d="M284 111 L310 137 L336 111"></path>
            <path class="core-plate" d="M284 169 L310 143 L336 169"></path>
            <line class="core-line" x1="286" y1="114" x2="334" y2="166"></line>
            <line class="core-line" x1="334" y1="114" x2="286" y2="166"></line>
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
  "%c HRV Card %c loaded - airflow layout v2: Exhaust top-left, Outdoor bottom-left ",
  "color: white; background: #03a9f4; font-weight: 700; padding: 2px 4px; border-radius: 3px 0 0 3px;",
  "color: white; background: #4caf50; font-weight: 700; padding: 2px 4px; border-radius: 0 3px 3px 0;"
);
