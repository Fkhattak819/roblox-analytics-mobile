import assert from 'node:assert/strict';
import test from 'node:test';
import { creatorHubUrl, creatorTools, nativeCreatorSection } from '../src/data/creator-tools';

test('Creator Hub links stay scoped to the selected real universe', () => {
  assert.equal(creatorHubUrl('10009166512', 'monetization/passes'), 'https://create.roblox.com/dashboard/creations/experiences/10009166512/monetization/passes');
  assert.equal(creatorHubUrl('42', 'analytics/retention'), 'https://create.roblox.com/dashboard/creations/experiences/42/analytics/retention');
  for (const invalid of ['0', '', '../10009166512', '42?other=true']) assert.equal(creatorHubUrl(invalid, 'overview'), undefined);
  assert.equal(creatorHubUrl('42', '../../settings'), undefined);
});
test('Native report links preserve Creator Hub section identity', () => {
  assert.equal(nativeCreatorSection('monetization/overview'), 'monetization');
  assert.equal(nativeCreatorSection('safety/overview'), 'safety');
  assert.equal(nativeCreatorSection('configure'), undefined);
  assert.equal(new Set(creatorTools.map((tool) => `${tool.group}/${tool.path}`)).size, creatorTools.length);
});
