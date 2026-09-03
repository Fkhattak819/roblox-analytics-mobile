import assert from 'node:assert/strict';
import test from 'node:test';

import { metricTrendDirection } from '../src/utils/metric-trend-direction';

test('metric trends follow arrow and sign direction', () => {
  assert.equal(metricTrendDirection('↑ 12.4%'), 'positive');
  assert.equal(metricTrendDirection('+12.4%'), 'positive');
  assert.equal(metricTrendDirection('↓ 4.8%'), 'negative');
  assert.equal(metricTrendDirection('-4.8%'), 'negative');
  assert.equal(metricTrendDirection('—'), 'neutral');
});

test('semantic direction overrides the numeric arrow for inverse metrics', () => {
  assert.equal(metricTrendDirection('↓ 7.1%', 'positive'), 'positive');
  assert.equal(metricTrendDirection('↑ 2.3%', 'negative'), 'negative');
  assert.equal(metricTrendDirection('0.0%', 'neutral'), 'neutral');
});
