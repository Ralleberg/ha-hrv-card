import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the real source with a minimal host; no Home Assistant services run.
const registry = new Map();
class HTMLElement {
  attachShadow() {
    this.shadowRoot = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  }
  dispatchEvent(event) { this.lastEvent = event; }
}
const context = vm.createContext({
  HTMLElement,
  customElements: { get: (name) => registry.get(name), define: (name, ctor) => registry.set(name, ctor) },
  window: {}, console: { info() {} },
  CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
});
const source = readFileSync(new URL('../src/hrv-card.ts', import.meta.url), 'utf8');
vm.runInContext(source, context);
const Card = registry.get('hrv-card');
function cardWith(entities = {}, states = {}, appearance = {}) {
  const card = new Card();
  card.setConfig({ entities, appearance });
  card.hass = { states };
  return card;
}
const state = (value, attributes = {}) => ({ state: value, attributes });

test('partial configurations and unavailable sensors render without throwing', () => {
  const card = cardWith({ outdoor_temperature: 'sensor.outdoor' }, { 'sensor.outdoor': state('unavailable') });
  assert.equal(card._formatTemp('outdoor_temperature'), '—');
  assert.equal(card._formatTemp('supply_temperature'), '—');
  assert.match(card.shadowRoot.innerHTML, /<ha-card>/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="rpm-inline"/);
});

test('temperature and RPM units are rendered as text, including special characters', () => {
  const unit = '<custom-unit>&"';
  const card = cardWith(
    { outdoor_temperature: 'sensor.outdoor', fan1_rpm: 'sensor.fan' },
    { 'sensor.outdoor': state('12.5', { unit_of_measurement: unit }), 'sensor.fan': state('1200', { unit_of_measurement: unit }) },
  );
  assert.match(card.shadowRoot.innerHTML, /12\.5&lt;custom-unit&gt;&amp;&quot;/);
  assert.match(card.shadowRoot.innerHTML, /1200 &lt;custom-unit&gt;&amp;&quot;/);
  assert.ok(!card.shadowRoot.innerHTML.includes(unit));
});

test('bypass display text cannot introduce SVG markup', () => {
  const card = cardWith({ bypass: 'sensor.bypass' }, { 'sensor.bypass': state('closed') });
  card.hass = { states: card._hass.states, formatEntityState: () => '<translated>&' };
  // Trigger an actual state update rather than the unchanged-state optimization.
  card.hass = { ...card._hass, states: { 'sensor.bypass': state('opening') } };
  assert.match(card.shadowRoot.innerHTML, /&lt;translated&gt;&amp;/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<translated>/);
});

test('entity attributes are escaped while more-info keeps the original ID', () => {
  const entityId = 'sensor.example" data-extra="value';
  const card = cardWith({ outdoor_temperature: entityId, mode: entityId });
  assert.match(card._svgEntityAttrs('outdoor_temperature'), /&quot;/);
  assert.match(card._badge('Mode', 'Auto', 'mode'), /&quot;/);
  card._fireMoreInfo(entityId);
  assert.equal(card.lastEvent.type, 'hass-more-info');
  assert.equal(card.lastEvent.detail.entityId, entityId);
  assert.equal(card.lastEvent.bubbles, true);
});

test('heat recovery retains clamping and inversion', () => {
  const entities = { heat_recovery: 'sensor.recovery' };
  assert.equal(cardWith(entities, { 'sensor.recovery': state('120') })._formatHeatRecovery(), '100%');
  assert.equal(cardWith(entities, { 'sensor.recovery': state('-10') })._formatHeatRecovery(), '0%');
  assert.equal(cardWith(entities, { 'sensor.recovery': state('30') }, { invert_heat_recovery: true })._formatHeatRecovery(), '70%');
});

test('unrelated state updates do not rebuild the card, relevant updates do', () => {
  const card = cardWith({ outdoor_temperature: 'sensor.outdoor' }, { 'sensor.outdoor': state('10') });
  const render = card._render.bind(card);
  let renders = 0;
  card._render = () => { renders++; render(); };
  card.hass = { states: { ...card._hass.states, 'sensor.other': state('2') } };
  assert.equal(renders, 0);
  card.hass = { states: { 'sensor.outdoor': state('11') } };
  assert.equal(renders, 1);
  assert.match(card.shadowRoot.innerHTML, /11\.0°C/);
});

test('select controls preserve the service payload', () => {
  const card = cardWith();
  let payload;
  card.hass = { states: {}, callService: (...args) => { payload = args; } };
  card._setSelectOption('select.mode', 'automatic');
  assert.equal(payload[0], 'select');
  assert.equal(payload[1], 'select_option');
  assert.equal(payload[2].entity_id, 'select.mode');
  assert.equal(payload[2].option, 'automatic');
});
