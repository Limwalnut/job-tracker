import { execFileSync } from 'node:child_process';
import { appendFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isProtectedPath } from './review-policy.mjs';

function git(args, options = {}) {
  return execFileSync('git', ['-C', process.env.WORKTREE_PATH, ...args], options);
}

async function writePatchDigest(patch) {
  const digest = createHash('sha256').update(patch).digest('hex');
  await appendFile(process.env.GITHUB_OUTPUT, `patch_sha256=${digest}\n`);
}

async function main() {
  const worktree = process.env.WORKTREE_PATH;
  const patchFile = process.env.PATCH_FILE;
  if (!worktree || !patchFile) throw new Error('Patch capture paths are missing.');

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

  const patch = git(['diff', '--binary', '--no-ext-diff', '--no-renames', 'HEAD']);
  if (patch.length > 2_000_000) throw new Error('Generated patch exceeds the 2 MB safety limit.');
  await writeFile(patchFile, patch);
  await writePatchDigest(patch);
  console.log(`Captured a ${patch.length}-byte patch across ${changedPaths.length} files.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
