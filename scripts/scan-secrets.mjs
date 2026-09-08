import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

// Scanner output is captured, never echoed. Reports contain redacted values and
// are kept in an ignored directory; only rule/location metadata reaches stdout.
const executable = process.env.GITLEAKS_PATH || 'gitleaks';
const root = process.cwd();
const reportRoot = resolve('.security-scan');
mkdirSync(reportRoot, { recursive: true });
const staging = mkdtempSync(join(reportRoot, 'source-'));
let failed = false;
function scan(name, args) {
  const report = join(reportRoot, `${name}.json`);
  rmSync(report, { force: true });
  const result = spawnSync(executable, [...args, `--config=${resolve('.gitleaks.toml')}`, '--redact=100', '--no-banner', '--max-decode-depth=2',
    '--report-format=json', `--report-path=${report}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || ![0, 1].includes(result.status)) {
    failed = true;
    console.log(JSON.stringify({ scan: name, status: 'scanner_failed' }));
    return;
  }
  let findings;
  try { findings = JSON.parse(readFileSync(report, 'utf8')); }
  catch { failed = true; console.log(JSON.stringify({ scan: name, status: 'report_missing' })); return; }
  failed ||= result.status !== 0 || findings.length > 0;
  console.log(JSON.stringify({ scan: name, findings: findings.map((item) => ({
    rule: item.RuleID, file: item.File, line: item.StartLine, commit: item.Commit,
  })) }));
}
try {
  const inventory = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  if (inventory.status !== 0) throw new Error('Cannot inventory source');
  for (const file of new Set(inventory.stdout.split('\0').filter(Boolean))) {
    const target = resolve(staging, file);
    if (!target.startsWith(staging + (process.platform === 'win32' ? '\\' : '/'))) throw new Error('Invalid source path');
    mkdirSync(dirname(target), { recursive: true });
    cpSync(resolve(root, file), target, { dereference: false });
  }
  scan('history', ['git', '--log-opts=--all', root]);
  scan('working-source', ['dir', staging]);
  for (const [index, directory] of process.argv.slice(2).entries()) {
    scan(`artifact-${index}`, ['dir', resolve(directory)]);
  }
} finally {
  // This path is created locally above, always inside the ignored report folder.
  rmSync(staging, { recursive: true, force: true });
}
process.exitCode = failed ? 1 : 0;
