import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { decodeAttemptMarker, isEligibleReview, isProtectedPath, latestMatchingReview } from './review-policy.mjs';
import { parseAndValidatePatchNumstat, verifyPatchDigest } from './patch-policy.mjs';
import { pullRequestSnapshot } from './github-api.mjs';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const number = process.env.PR_NUMBER;
const expectedSha = process.env.EXPECTED_HEAD_SHA;
const expectedReviewId = process.env.EXPECTED_REVIEW_ID;
const controlPath = process.env.CONTROL_PATH;
const worktree = process.env.WORKTREE_PATH;

function git(args, cwd = worktree, options = {}) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

async function verifyCurrentReview() {
  const snapshot = await pullRequestSnapshot(repository, number, token);
  const review = snapshot.reviews.find((item) => String(item.id) === String(expectedReviewId));
  const latestReview = latestMatchingReview(snapshot.reviews);
  const result = isEligibleReview({
    repository,
    pullRequest: snapshot.pullRequest,
    review,
    latestReview,
    changedPaths: snapshot.changedFiles.map((file) => file.filename),
  });
  if (!result.eligible || snapshot.pullRequest.head.sha !== expectedSha) {
    throw new Error('Publish stopped because the PR head or latest review changed.');
  }
  const attempt = snapshot.comments
    .filter((comment) => comment.user?.login === 'github-actions[bot]')
    .map((comment) => decodeAttemptMarker(comment.body))
    .find((value) => value && String(value.reviewId) === String(expectedReviewId) && value.headSha === expectedSha);
  if (!attempt || String(attempt.round) !== String(process.env.ROUND)) {
    throw new Error('Publish stopped because the matching reserved attempt marker was not found.');
  }
  return { branch: snapshot.pullRequest.head.ref, requirementId: result.requirementId };
}

async function main() {
  if (!token || !/^\d+$/.test(number ?? '') || !/^[a-f0-9]{40}$/i.test(expectedSha ?? '') || !worktree || !controlPath) {
    throw new Error('Publish context is incomplete.');
  }
  const { branch, requirementId } = await verifyCurrentReview();
  if (!/^codex\/[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..') || branch.endsWith('/')) {
    throw new Error('Publish stopped because the target branch name is unsafe.');
  }

  const patch = await readFile(process.env.PATCH_FILE);
  verifyPatchDigest(patch, process.env.EXPECTED_PATCH_SHA256);
  if (!patch.length) {
    console.log('No changes were generated; nothing will be pushed.');
    return;
  }
  if (patch.length > 2_000_000) throw new Error('Patch exceeds the 2 MB safety limit.');
  git(['fetch', '--no-tags', 'origin', `refs/pull/${number}/head`], controlPath);
  const fetchedHead = git(['rev-parse', 'FETCH_HEAD'], controlPath).toString('utf8').trim();
  if (fetchedHead !== expectedSha) throw new Error('Publish stopped because the PR branch moved after review.');
  git(['worktree', 'add', '--detach', worktree, expectedSha], controlPath);
  git(['apply', '--check', '--binary'], worktree, { input: patch });
  const pathsOutput = git(['apply', '--numstat', '--binary'], worktree, { input: patch }).toString('utf8');
  parseAndValidatePatchNumstat(pathsOutput);

  // Recheck before applying the patch, then again after commit immediately before push.
  const beforePush = await verifyCurrentReview();
  if (beforePush.branch !== branch || beforePush.requirementId !== requirementId) throw new Error('Publish stopped because PR metadata changed.');
  const currentFetchedHead = git(['rev-parse', 'HEAD']).toString('utf8').trim();
  if (currentFetchedHead !== expectedSha) throw new Error('Publish stopped because the fetched branch does not match the reviewed commit.');

  git(['apply', '--binary'], worktree, { input: patch });
  const status = git(['status', '--porcelain', '--untracked-files=all']).toString('utf8').trim();
  if (!status) {
    console.log('Patch produced no effective changes; nothing will be pushed.');
    return;
  }
  const names = git(['diff', '--name-only', '-z', 'HEAD']).toString('utf8').split('\0').filter(Boolean);
  const added = git(['ls-files', '--others', '--exclude-standard', '-z']).toString('utf8').split('\0').filter(Boolean);
  for (const path of [...names, ...added]) {
    if (path.startsWith('/') || path.split('/').includes('..') || path.includes('\\') || isProtectedPath(path)) {
      throw new Error('Publish rejected a protected or unsafe path.');
    }
  }
  git(['add', '--all']);
  git(['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', `fix: address ${requirementId} review feedback (round ${process.env.ROUND})`]);

  // No force push: any head update racing this check makes the push fail safely.
  await verifyCurrentReview();
  git(['push', 'origin', `HEAD:refs/heads/${branch}`]);
  console.log('Validated changes were pushed to the existing pull request branch.');
  git(['worktree', 'remove', '--force', worktree], controlPath);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
