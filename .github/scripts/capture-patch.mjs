import { execFileSync } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { isProtectedPath } from './review-policy.mjs';
import { parseAndValidatePatchNumstat, validateBaseTreeModes, validatePackageScriptsUnchanged, validatePatchText } from './patch-policy.mjs';

function git(args, options = {}) {
  return execFileSync('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-C', process.env.WORKTREE_PATH, ...args], {
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', ...options.env },
    ...options,
  });
}

async function writePatchDigest(patch) {
  const digest = createHash('sha256').update(patch).digest('hex');
  await appendFile(process.env.GITHUB_OUTPUT, `patch_sha256=${digest}\n`);
}

async function main() {
  const worktree = process.env.WORKTREE_PATH;
  const patchFile = process.env.PATCH_FILE;
  if (!worktree || !patchFile) throw new Error('Patch capture paths are missing.');
  const expectedHead = process.env.EXPECTED_HEAD_SHA;
  if (!/^[a-f0-9]{40}$/i.test(expectedHead ?? '') || git(['rev-parse', 'HEAD']).toString('utf8').trim() !== expectedHead) {
    throw new Error('Patch capture stopped because the source checkout does not match the reviewed head SHA.');
  }

  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).toString('utf8').split('\0').filter(Boolean);
  for (const file of untracked) git(['add', '--intent-to-add', '--', file]);

  const changedPaths = git(['diff', '--name-only', '-z', 'HEAD']).toString('utf8').split('\0').filter(Boolean);
  if (!changedPaths.length) {
    await writeFile(patchFile, '');
    await writePatchDigest(Buffer.alloc(0));
    console.log('Codex made no file changes.');
    return;
  }
  const unsafe = changedPaths.find(isProtectedPath);
  if (unsafe) throw new Error('Patch contains a protected automation, secret, or generated path; rejecting it.');

  const patch = git(['diff', '--no-ext-diff', '--no-textconv', '--no-renames', 'HEAD']);
  if (patch.length > 2_000_000) throw new Error('Generated patch exceeds the 2 MB safety limit.');
  validatePatchText(patch);
  const numstat = git(['diff', '--numstat', '--no-ext-diff', '--no-textconv', '--no-renames', 'HEAD']).toString('utf8');
  const paths = parseAndValidatePatchNumstat(numstat);
  validateBaseTreeModes(git(['ls-tree', '-r', '-z', '--full-tree', 'HEAD', '--', ...paths]), paths);
  for (const path of paths.filter((value) => value.toLowerCase() === 'package.json' || value.toLowerCase().endsWith('/package.json'))) {
    let original = '';
    try { original = git(['show', `HEAD:${path}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8'); }
    catch { /* New manifest. */ }
    const updated = await readFile(join(worktree, path), 'utf8');
    validatePackageScriptsUnchanged(original, updated);
  }
  await writeFile(patchFile, patch);
  await writePatchDigest(patch);
  console.log(`Captured a ${patch.length}-byte patch across ${changedPaths.length} files.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
