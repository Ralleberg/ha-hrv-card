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

test('mode and level select entities render inline controls with selected options', () => {
  const card = cardWith({ mode: 'select.mode', level: 'select.level' }, {
    'select.mode': state('automatic', { options: ['automatic', 'manual'] }),
    'select.level': state('2', { options: ['1', '2', '3'] }),
  });
  assert.match(card.shadowRoot.innerHTML, /<select data-select-entity="select.mode"/);
  assert.match(card.shadowRoot.innerHTML, /<select data-select-entity="select.level"/);
  assert.match(card.shadowRoot.innerHTML, /value="automatic" selected>Automatic/);
  assert.match(card.shadowRoot.innerHTML, /value="2" selected>2/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<button[^>]*data-entity="select.mode"/);
  card.setConfig({ entities: card._config.entities, appearance: { show_badges: false } });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<select /);
});

test('read-only entities and selects without options retain localized badges', () => {
  const card = cardWith({ mode: 'sensor.mode', level: 'select.level' }, {
    'sensor.mode': state('automatic'), 'select.level': state('low'),
  });
  card.hass = { ...card._hass, language: 'da' };
  assert.match(card.shadowRoot.innerHTML, /<button[^>]*data-entity="sensor.mode"/);
  assert.match(card.shadowRoot.innerHTML, /<strong>Automatisk<\/strong>/);
  assert.match(card.shadowRoot.innerHTML, /<button[^>]*data-entity="select.level"/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /<select /);
});

test('unavailable selects are disabled and unmatched states do not select the first option', () => {
  for (const currentState of ['unknown', 'unavailable', 'custom']) {
    const card = cardWith({ mode: 'select.mode' }, {
      'select.mode': state(currentState, { options: ['automatic', 'manual'] }),
    });
    assert.match(card.shadowRoot.innerHTML, /<option value="" selected disabled>/);
    assert.doesNotMatch(card.shadowRoot.innerHTML, /value="automatic" selected/);
    if (currentState !== 'custom') {
      assert.match(card.shadowRoot.innerHTML, /<select[^>]* disabled>/);
    }
  }
});

test('rendered select values and labels escape special characters', () => {
  const option = 'a"<tag>&';
  const card = cardWith({ mode: 'select.mode' }, {
    'select.mode': state(option, { options: [option] }),
  });
  assert.match(card.shadowRoot.innerHTML, /value="a&quot;&lt;tag&gt;&amp;" selected/);
  assert.ok(!card.shadowRoot.innerHTML.includes('<tag>'));
});

test('render attaches change handlers that send the selected option to Home Assistant', () => {
  const card = cardWith({ mode: 'select.mode' }, {
    'select.mode': state('automatic', { options: ['automatic', 'manual'] }),
  });
  let change;
  const element = {
    dataset: { selectEntity: 'select.mode' },
    addEventListener: (type, callback) => { if (type === 'change') change = callback; },
  };
  card.shadowRoot.querySelectorAll = (selector) => selector === '[data-select-entity]' ? [element] : [];
  let payload;
  card.hass = { ...card._hass, language: 'da', callService: (...args) => { payload = args; } };
  assert.equal(typeof change, 'function');
  change({ target: { value: 'manual' } });
  assert.equal(payload[0], 'select');
  assert.equal(payload[1], 'select_option');
  assert.equal(payload[2].entity_id, 'select.mode');
  assert.equal(payload[2].option, 'manual');
  assert.match(card.shadowRoot.innerHTML, /value="automatic" selected>Automatisk/);
});
