"""Render the shipped YAML templates with Home Assistant-like state helpers.

These tests check calculation behavior, not Home Assistant's full integration.
"""
import math
from pathlib import Path
import unittest

from jinja2 import Environment, StrictUndefined
import yaml

ROOT = Path(__file__).resolve().parents[1]


class InputLoader(yaml.SafeLoader):
    pass


InputLoader.add_constructor('!input', lambda loader, node: ('input', loader.construct_scalar(node)))
BLUEPRINT = yaml.load((ROOT / 'blueprints/template/heat_recovery_efficiency.yaml').read_text(), Loader=InputLoader)


def is_number(value):
    try:
        return math.isfinite(float(value))
    except (ValueError, TypeError):
        return False


def render(values, **inputs):
    config = {'outdoor_temperature': 'sensor.outdoor', 'supply_temperature': 'sensor.supply',
              'extract_temperature': 'sensor.extract'}
    config.update({key: spec['default'] for key, spec in BLUEPRINT['blueprint']['input'].items() if 'default' in spec})
    config.update(inputs)
    variables = {key: config[reference[1]] for key, reference in BLUEPRINT['variables'].items()}
    env = Environment(undefined=StrictUndefined)
    env.globals.update(states=lambda entity: str(values.get(entity, 'unknown')), is_number=is_number)
    sensor = BLUEPRINT['sensor']
    available = env.from_string(sensor['availability']).render(**variables).strip().lower() == 'true'
    result = env.from_string(sensor['state']).render(**variables).strip()
    return available, None if result == 'None' else float(result)


def temperatures(outdoor=0, supply=16, extract=20, bypass=None):
    values = {'sensor.outdoor': outdoor, 'sensor.supply': supply, 'sensor.extract': extract}
    if bypass is not None:
        values['sensor.bypass'] = bypass
    return values


class HeatRecoveryBlueprintTests(unittest.TestCase):
    def test_inputs_and_metadata(self):
        self.assertEqual(BLUEPRINT['blueprint']['domain'], 'template')
        for reference in BLUEPRINT['variables'].values():
            self.assertEqual(reference[0], 'input')
            self.assertIn(reference[1], BLUEPRINT['blueprint']['input'])
        self.assertEqual(BLUEPRINT['sensor']['state_class'], 'measurement')
        self.assertEqual(BLUEPRINT['sensor']['unit_of_measurement'], '%')

    def test_heating_cooling_and_clamping(self):
        for outdoor, supply, extract, expected in [(0, 16, 20, 80), (30, 24, 20, 60),
                                                  (0, 25, 20, 100), (0, -5, 20, 0),
                                                  (0, 10, 30, 33.3)]:
            with self.subTest(outdoor=outdoor, supply=supply):
                self.assertEqual(render(temperatures(outdoor, supply, extract)), (True, expected))

    def test_invalid_temperatures(self):
        for entity in ['sensor.outdoor', 'sensor.supply', 'sensor.extract']:
            for value in ['unknown', 'unavailable', '', 'invalid', 'nan', 'inf', '-inf']:
                with self.subTest(entity=entity, value=value):
                    values = temperatures()
                    values[entity] = value
                    self.assertEqual(render(values), (False, None))
        self.assertEqual(render({}), (False, None))

    def test_nearly_equal_temperatures(self):
        for extract in [0, 0.05, 0.1, -0.1]:
            with self.subTest(extract=extract):
                self.assertEqual(render(temperatures(extract=extract)), (False, None))
        self.assertEqual(render(temperatures(extract=0.5), minimum_temperature_difference=1), (False, None))

    def test_open_bypass(self):
        for state in BLUEPRINT['blueprint']['input']['bypass_open_states']['default']:
            with self.subTest(state=state):
                self.assertEqual(render(temperatures(bypass=state), bypass='sensor.bypass'), (True, 0))
        # An open bypass definitively means no recovery even if temperatures are missing.
        self.assertEqual(render({'sensor.bypass': 'open'}, bypass='sensor.bypass'), (True, 0))

    def test_closed_bypass(self):
        for state in BLUEPRINT['blueprint']['input']['bypass_closed_states']['default']:
            with self.subTest(state=state):
                self.assertEqual(render(temperatures(bypass=state), bypass='sensor.bypass'), (True, 80))

    def test_unknown_bypass_does_not_claim_recovery(self):
        for state in ['unknown', 'unavailable', '', 'unexpected']:
            with self.subTest(state=state):
                self.assertEqual(render(temperatures(bypass=state), bypass='sensor.bypass'), (False, None))

    def test_custom_bypass_states_and_normalization(self):
        self.assertEqual(render(temperatures(bypass=' BYPASSED '), bypass='sensor.bypass',
                                bypass_open_states=['Bypassed']), (True, 0))
        self.assertEqual(render(temperatures(bypass='RECOVERY'), bypass='sensor.bypass',
                                bypass_closed_states=['Recovery']), (True, 80))
        self.assertEqual(render(temperatures(bypass='unknown'), bypass='sensor.bypass',
                                bypass_open_states=['unknown']), (False, None))

    def test_documented_example_inputs_match_blueprint(self):
        text = (ROOT / 'README.md').read_text()
        marker = '  - use_blueprint:\n'
        example = text[text.index(marker):].split('```', 1)[0]
        example = yaml.safe_load('template:\n' + example)['template'][0]
        self.assertTrue(set(example['use_blueprint']['input']).issubset(BLUEPRINT['blueprint']['input']))
        self.assertEqual(example['use_blueprint']['path'], 'Ralleberg/heat_recovery_efficiency.yaml')


if __name__ == '__main__':
    unittest.main()
