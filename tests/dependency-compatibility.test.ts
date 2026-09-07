import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

test('patched URI decoder preserves query-string behavior', () => {
  const query = require('query-string');
  const parsed = query.parse('space=hello+world&unicode=%E2%9C%93&item=a&item=b&empty=&bad=%FF');
  assert.deepEqual({ ...parsed }, { space: 'hello world', unicode: '✓', item: ['a', 'b'], empty: '', bad: '%FF' });
  assert.equal(require('decode-uri-component')('hello+world'), 'hello world');
  assert.throws(() => require('decode-uri-component')(null), TypeError);
});

test('malformed percent runs cannot stall the query parser', () => {
  const probe = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const query = require('query-string');
    const malformed = '%FF'.repeat(20000);
    assert.equal(query.parse('value=' + malformed).value, malformed);
    assert.equal(query.parse('value=%E2%9C%93%FF').value, '✓%FF');
  `], { timeout: 3000, encoding: 'utf8' });
  assert.equal(probe.error, undefined);
  assert.equal(probe.status, 0);
});

test('patched UUID supports the Xcode project identifier consumer', () => {
  const xcode = require('xcode');
  const project = xcode.project('synthetic.pbxproj');
  project.hash = { project: { objects: {} } };
  const first = project.generateUuid();
  const second = project.generateUuid();
  assert.match(first, /^[A-F0-9]{24}$/);
  assert.notEqual(first, second);
});

test('patched UUID remains callable by the tunnel package without opening a tunnel', () => {
  const consumer = createRequire(require.resolve('@expo/ngrok'));
  const uuid = consumer('uuid');
  assert.equal(uuid.validate(uuid.v4()), true);
  assert.equal(typeof require('@expo/ngrok').connect, 'function');
});

test('patched PostCSS processes CSS through the Metro consumer dependency', async () => {
  const expo = createRequire(require.resolve('expo/package.json'));
  const metro = createRequire(expo.resolve('@expo/metro-config'));
  const postcss = metro('postcss');
  const result = await postcss([]).process('a { color: red }', { from: undefined });
  assert.equal(result.css, 'a { color: red }');
});

test('patched Metro reads project image assets and rejects a zero-length ICNS block', () => {
  const assetsPath = join(dirname(require.resolve('metro/package.json')), 'src/Assets.js');
  const { getAssetSize } = require(assetsPath);
  const dimensions = getAssetSize('png', readFileSync('assets/experiences/fling_squishies.png'), 'sample.png');
  assert.ok(dimensions.width > 0 && dimensions.height > 0);
  // A child-process timeout makes regression to the old looping parser bounded.
  const probe = spawnSync(process.execPath, ['-e', `
    const { getAssetSize } = require(process.argv[1]);
    const data = Buffer.alloc(16);
    data.write('icns'); data.writeUInt32BE(16, 4); data.write('ic07', 8);
    try { getAssetSize('png', data, 'malformed.png'); process.exitCode = 1; }
    catch { process.exitCode = 0; }
  `, assetsPath], { timeout: 2000, encoding: 'utf8' });
  assert.equal(probe.error, undefined);
  assert.equal(probe.status, 0);
});
