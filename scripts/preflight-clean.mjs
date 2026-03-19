import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const initialCwd = process.cwd();
const repoRoot = run('git', ['rev-parse', '--show-toplevel'], {
  cwd: initialCwd,
  capture: true
}).trim();
const ref = process.argv[2] ?? resolveDefaultRef();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imaginizim-preflight-'));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  run('git', [
    '-c',
    'core.autocrlf=false',
    '-c',
    'core.eol=lf',
    'worktree',
    'add',
    '--detach',
    tempDir,
    ref
  ]);
  run('git', ['config', 'core.autocrlf', 'false'], { cwd: tempDir });
  run('git', ['config', 'core.eol', 'lf'], { cwd: tempDir });
  run('git', ['reset', '--hard', 'HEAD'], { cwd: tempDir });
  run(npmCommand, ['ci'], { cwd: tempDir });
  run(npmCommand, ['run', 'check'], { cwd: tempDir });
} finally {
  run('git', ['worktree', 'remove', '--force', tempDir], { cwd: repoRoot, allowFailure: true });
  run('git', ['worktree', 'prune'], { cwd: repoRoot, allowFailure: true });
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: options.capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });

  if (result.error && !options.allowFailure) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`
    );
  }

  return result.stdout ?? '';
}

function resolveDefaultRef() {
  const isDirty = run('git', ['status', '--short'], { capture: true }).trim().length > 0;

  if (isDirty) {
    throw new Error(
      'Working tree is dirty. Commit or stash your changes first, or pass an explicit ref to validate.'
    );
  }

  return 'HEAD';
}
