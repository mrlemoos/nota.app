#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = join(root, 'apps', 'nota-electron');

function parseVersion(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--version' || a === '-v') {
      const v = argv[i + 1];
      if (v) return v;
    }
    if (a.startsWith('--version=')) return a.slice('--version='.length);
    if (a.startsWith('-v=')) return a.slice('-v='.length);
  }
  const semverRe = /^\d+\.\d+\.\d+(-[\w.-]+)?$/;
  for (const a of argv) {
    if (semverRe.test(a)) return a;
  }
  return null;
}

function run(cmd, args, options) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
  if (r.error) throw r.error;
  return r.status ?? 1;
}

const argv = process.argv.slice(2);
const version = parseVersion(argv);

if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  console.error(
    'electron-github-release: set GH_TOKEN or GITHUB_TOKEN (repo scope) to publish to GitHub Releases.',
  );
  process.exit(1);
}

if (version) {
  const code = run('npm', ['version', version, '--no-git-tag-version', '--allow-same-version'], {
    cwd: electronDir,
  });
  if (code !== 0) process.exit(code);
}

const code = run('npx', ['electron-builder', '--publish', 'always'], { cwd: electronDir });
process.exit(code);
