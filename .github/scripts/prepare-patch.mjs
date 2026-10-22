import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parseAndValidatePatchNumstat, verifyPatchDigest } from './patch-policy.mjs';

function git(args, options = {}) {
  return execFileSync('git', ['-C', process.env.WORKTREE_PATH, ...args], options);
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

  const numstat = git(['apply', '--numstat', '--binary'], { input: patch }).toString('utf8');
  const paths = parseAndValidatePatchNumstat(numstat);
  git(['apply', '--check', '--binary'], { input: patch });
  git(['apply', '--binary'], { input: patch });
  console.log(`Applied and checked a patch covering ${paths.length} files.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
