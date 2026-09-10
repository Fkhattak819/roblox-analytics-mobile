import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const action = process.argv[2] ?? 'start';
const actions = {
  start: ['start', '--localhost', '--ios'],
  export: ['export', '--platform', 'ios', '--output-dir', 'artifacts/reviewer-ios'],
  build: ['run:ios', '--configuration', 'Release', '--no-bundler'],
};
if (!Object.hasOwn(actions, action)) {
  console.error('Usage: node scripts/reviewer.mjs [start|export|build]');
  process.exit(2);
}
// Ignore local developer settings so reviewer artifacts always use fixtures.
const child = spawn(process.execPath, [
  fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url)),
  ...actions[action], ...process.argv.slice(3),
], {
  cwd, stdio: 'inherit',
  env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1',
    EXPO_PUBLIC_DATA_MODE: 'sample', EXPO_PUBLIC_API_BASE_URL: '' },
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
