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

test('percentage fan levels scale the airflow speed instead of saturating at level 4', () => {
  const entities = { level: 'sensor.fan_speed' };
  const percent = (value) => cardWith(entities, { 'sensor.fan_speed': state(value, { unit_of_measurement: '%' }) });
  assert.equal(percent('100')._fanLevel(), 4);
  assert.equal(percent('50')._fanLevel(), 2);
  assert.equal(percent('0')._flowDuration(), '0s');
  assert.ok(Math.abs(Number.parseFloat(percent('100')._flowDuration()) - 1.6) < 1e-9);
  assert.ok(Number.parseFloat(percent('50')._flowDuration()) > 3);
  assert.equal(cardWith(entities, { 'sensor.fan_speed': state('3') })._fanLevel(), 3);
  assert.equal(cardWith(entities, { 'sensor.fan_speed': state('79') })._fanLevel(), 4);
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

test('mode and level remain localized badges even for writable select entities', () => {
  const card = cardWith({ mode: 'select.mode', level: 'select.level' }, {
    'select.mode': state('manual', { options: ['automatic', 'manual'] }),
    'select.level': state('2', { options: ['1', '2', '3'] }),
  });
  card.hass = { ...card._hass, language: 'da' };
  assert.match(card.shadowRoot.innerHTML, /<button[^>]*data-entity="select.mode"/);
  assert.match(card.shadowRoot.innerHTML, /<strong>Manuel<\/strong>/);
  assert.match(card.shadowRoot.innerHTML, /<button[^>]*data-entity="select.level"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<select|select-control|data-select-entity/);
  card.setConfig({ entities: card._config.entities, appearance: { show_badges: false } });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<button/);
});

test('mode badge click and keyboard activation open more-info without service calls', () => {
  const card = cardWith({ mode: 'select.mode' }, {
    'select.mode': state('manual', { options: ['automatic', 'manual'] }),
  });
  const handlers = {};
  const element = {
    dataset: { entity: 'select.mode' },
    addEventListener: (type, callback) => { handlers[type] = callback; },
  };
  card.shadowRoot.querySelectorAll = (selector) => selector === '[data-entity]' ? [element] : [];
  let serviceCalls = 0;
  card.hass = { ...card._hass, language: 'da', callService: () => serviceCalls++ };
  handlers.click();
  assert.equal(card.lastEvent.type, 'hass-more-info');
  assert.equal(card.lastEvent.detail.entityId, 'select.mode');
  for (const key of ['Enter', ' ']) {
    card.lastEvent = undefined;
    let prevented = false;
    handlers.keydown({ key, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(card.lastEvent.detail.entityId, 'select.mode');
  }
  assert.equal(serviceCalls, 0);
});

test('sensor and unavailable mode states keep the original badge behavior', () => {
  const card = cardWith({ mode: 'sensor.mode', level: 'select.level' }, {
    'sensor.mode': state('automatic'), 'select.level': state('unavailable'),
  });
  assert.match(card.shadowRoot.innerHTML, /data-entity="sensor.mode"/);
  assert.match(card.shadowRoot.innerHTML, /<strong>Automatic<\/strong>/);
  assert.match(card.shadowRoot.innerHTML, /data-entity="select.level"/);
  assert.match(card.shadowRoot.innerHTML, /<strong>—<\/strong>/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<select/);
});
