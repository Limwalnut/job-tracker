import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseAndValidatePatchNumstat, validateBaseTreeModes, validatePackageScriptsUnchanged, validatePatchText, verifyPatchDigest } from './patch-policy.mjs';

function git(args, options = {}) {
  return execFileSync('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-C', process.env.WORKTREE_PATH, ...args], {
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', ...options.env },
    ...options,
  });
}

async function main() {
  const patchFile = process.env.PATCH_FILE;
  if (!patchFile || !process.env.WORKTREE_PATH) throw new Error('Patch validation paths are missing.');
  const patch = await readFile(patchFile);
  verifyPatchDigest(patch, process.env.EXPECTED_PATCH_SHA256);
  if (!patch.length) {
    console.log('Patch is empty; validation will still run against the reviewed PR head.');
    return;
  }
  if (patch.length > 2_000_000) throw new Error('Patch exceeds the 2 MB safety limit.');

  validatePatchText(patch);
  const numstat = git(['apply', '--numstat', '--binary'], { input: patch }).toString('utf8');
  const paths = parseAndValidatePatchNumstat(numstat);
  validateBaseTreeModes(git(['ls-tree', '-r', '-z', '--full-tree', 'HEAD', '--', ...paths]), paths);
  git(['apply', '--check'], { input: patch });
  git(['apply'], { input: patch });
  for (const path of paths.filter((value) => value.toLowerCase() === 'package.json' || value.toLowerCase().endsWith('/package.json'))) {
    let original = '';
    try { original = git(['show', `HEAD:${path}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8'); }
    catch { /* New manifest. */ }
    const updated = await readFile(join(process.env.WORKTREE_PATH, path), 'utf8');
    validatePackageScriptsUnchanged(original, updated);
  }
  console.log(`Applied and checked a patch covering ${paths.length} files.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
