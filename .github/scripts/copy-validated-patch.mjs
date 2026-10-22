import { copyFile, readFile } from 'node:fs/promises';
import { verifyPatchDigest } from './patch-policy.mjs';

async function main() {
  const source = process.env.PATCH_FILE;
  const destination = process.env.VALIDATED_PATCH_FILE;
  if (!source || !destination) throw new Error('Validated patch paths are missing.');
  const patch = await readFile(source);
  verifyPatchDigest(patch, process.env.EXPECTED_PATCH_SHA256);
  await copyFile(source, destination);
  console.log('Copied the exact digest-checked patch for the publish job.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
