import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeAttemptMarker,
  isEligibleReview,
  isProtectedPath,
  latestMatchingReview,
  matchesRequirement,
  parseReviewHeader,
  parseReviewVerdict,
  reserveAttempt,
} from './review-policy.mjs';
import { parseAndValidatePatchNumstat, verifyPatchDigest } from './patch-policy.mjs';

const SHA = 'a'.repeat(40);
const BASE_PR = {
  state: 'open',
  draft: false,
  user: { login: 'Limwalnut' },
  head: { sha: SHA, ref: 'codex/req-001-update', repo: { full_name: 'Limwalnut/job-tracker' } },
  base: { ref: 'main' },
  title: 'REQ-001: update personal API tokens',
  body: 'Implements REQ-001.',
};
const VALID_BODY = '## Review: REQ-001\n\nPlease fix this behavior.\n\n**Verdict: changes requested.**';
const BASE_REVIEW = { id: 42, user: { login: 'Limwalnut' }, commit_id: SHA, submitted_at: '2026-10-20T12:00:00Z', body: VALID_BODY };

function eligible(overrides = {}) {
  const review = overrides.review ?? BASE_REVIEW;
  return isEligibleReview({
    repository: 'Limwalnut/job-tracker',
    pullRequest: BASE_PR,
    review,
    latestReview: review,
    changedPaths: [],
    ...overrides,
  });
}

test('accepts the exact PM review header and requirement identifier', () => {
  assert.equal(parseReviewHeader(VALID_BODY), 'REQ-001');
  assert.equal(matchesRequirement(VALID_BODY, 'REQ-001: API tokens', ''), 'REQ-001');
  assert.equal(matchesRequirement(VALID_BODY, 'REQ-0010: unrelated', ''), null);
  assert.equal(parseReviewHeader(` \n${VALID_BODY}`), null);
});

test('accepts standalone plain and bold verdict lines with optional terminal period', () => {
  for (const line of ['Verdict: changes requested', 'Verdict: changes requested.', '**Verdict: changes requested**', '**Verdict: changes requested.**']) {
    assert.equal(parseReviewVerdict(`## Review: REQ-001\n\n${line}`).verdict, 'changes_requested');
  }
  for (const line of ['Verdict: ready', '**Verdict: ready.**']) {
    assert.equal(parseReviewVerdict(`## Review: REQ-001\n\n${line}`).verdict, 'ready');
  }
});

test('rejects missing, ambiguous, appended, or noncanonical verdict text', () => {
  assert.equal(parseReviewVerdict('## Review: REQ-001\n\nPlease fix the bug.').verdict, null);
  assert.equal(parseReviewVerdict(`${VALID_BODY}\n\nVerdict: ready`).verdict, null);
  assert.equal(parseReviewVerdict('## Review: REQ-001\n\n**Verdict: changes requested.** More text').verdict, null);
  assert.equal(parseReviewVerdict('## Review: REQ-001\n\nVerdict: maybe').verdict, null);
  assert.equal(parseReviewVerdict('## Review: REQ-001\n\nVerdict: changes requested\nVerdict: ready').verdict, null);
  assert.equal(parseReviewVerdict('## Review: REQ-001\n\n```text\nVerdict: changes requested\n```').verdict, null);
  assert.equal(parseReviewVerdict('## Review: REQ-001\n\nVerdict: ready.\n\n```md\nVerdict: changes requested\n```').verdict, 'ready');
  assert.equal(parseReviewVerdict('## Review: REQ-001\n\n<!-- Verdict: changes requested -->\n\nVerdict: ready').verdict, 'ready');
});

test('accepts only the expected same-repository reviewer, author, branch, and current commit', () => {
  assert.deepEqual(eligible(), { eligible: true, reason: null, requirementId: 'REQ-001' });
  assert.equal(eligible({ repository: 'someone/fork' }).reason, 'wrong_repository');
  assert.equal(eligible({ pullRequest: { ...BASE_PR, user: { login: 'someone-else' } } }).reason, 'wrong_pull_request_author');
  assert.equal(eligible({ pullRequest: { ...BASE_PR, head: { ...BASE_PR.head, repo: { full_name: 'other/job-tracker' } } } }).reason, 'fork_pull_request');
  assert.equal(eligible({ pullRequest: { ...BASE_PR, head: { ...BASE_PR.head, ref: 'feature/work' } } }).reason, 'branch_not_codex_prefix');
  assert.equal(eligible({ pullRequest: { ...BASE_PR, head: { ...BASE_PR.head, sha: 'b'.repeat(40) } } }).reason, 'stale_review_commit');
  assert.equal(eligible({ review: { ...BASE_REVIEW, user: { login: 'another-reviewer' } } }).reason, 'wrong_reviewer');
  assert.equal(eligible({ review: { ...BASE_REVIEW, state: 'DISMISSED' } }).reason, 'review_dismissed');
  assert.equal(eligible({ latestReview: { ...BASE_REVIEW, id: 99 } }).reason, 'review_not_latest');
});

test('a newer ready review and unmatched requirement both stop automation', () => {
  const ready = { ...BASE_REVIEW, id: 43, body: '## Review: REQ-001\n\nVerdict: ready.' };
  assert.equal(eligible({ review: ready, latestReview: ready }).reason, 'review_is_ready');
  assert.equal(eligible({ pullRequest: { ...BASE_PR, title: 'Unrelated PR', body: '' } }).reason, 'requirement_id_not_matched');
  const older = BASE_REVIEW;
  const newer = { ...BASE_REVIEW, id: 44, submitted_at: '2026-10-21T12:00:00Z', body: '## Review: REQ-001\n\nVerdict: ready.' };
  assert.equal(latestMatchingReview([older, newer]).id, 44);
});

test('changes to workflow, policy, secrets, or generated paths are denied', () => {
  for (const path of ['.github/workflows/review-autofix.yml', '.github/scripts/gate.mjs', 'backend/AGENTS.md', '.codex/config.toml', '.env', 'frontend/.env.production', 'config/credentials.json', 'certs/key.pem', 'frontend/dist/app.js']) {
    assert.equal(isProtectedPath(path), true, path);
  }
  assert.equal(eligible({ changedPaths: ['.github/workflows/review-autofix.yml'] }).reason, 'automation_or_secret_paths_changed');
  assert.equal(isProtectedPath('backend/JobTracker.Api/Controllers/ApplicationsController.cs'), false);
});

test('patch validation rejects protected paths, traversal, odd filenames, and binaries', () => {
  assert.deepEqual(parseAndValidatePatchNumstat('3\t1\tbackend/Service.cs\n'), ['backend/Service.cs']);
  for (const value of [
    '1\t0\t.github/workflows/review-autofix.yml\n',
    '1\t0\t../outside.txt\n',
    '1\t0\tbackend/bad\tname.cs\n',
    '-\t-\tfrontend/logo.png\n',
  ]) {
    assert.throws(() => parseAndValidatePatchNumstat(value));
  }
});

test('patch digests bind validation and publishing to the exact generated bytes', () => {
  const emptySha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  assert.equal(verifyPatchDigest(Buffer.alloc(0), emptySha256), emptySha256);
  assert.throws(() => verifyPatchDigest(Buffer.from('changed'), emptySha256));
});

test('attempt reservation is deduplicated and capped for the pull request lifetime', () => {
  const comments = [];
  const first = reserveAttempt(comments, 101, SHA);
  assert.equal(first.action, 'reserve');
  assert.equal(first.round, 1);
  comments.push({ user: { login: 'github-actions[bot]' }, body: first.marker });
  assert.equal(reserveAttempt(comments, 101, SHA).action, 'duplicate');

  for (const [reviewId, round] of [[102, 2], [103, 3]]) {
    const next = reserveAttempt(comments, reviewId, SHA);
    assert.equal(next.round, round);
    comments.push({ user: { login: 'github-actions[bot]' }, body: next.marker });
  }
  assert.equal(reserveAttempt(comments, 104, SHA).action, 'handoff');
  comments.push({ user: { login: 'github-actions[bot]' }, body: `Done. ${'<!-- applyline-review-autofix-handoff:v1 -->'}` });
  assert.equal(reserveAttempt(comments, 104, SHA).action, 'capped');

  const forged = { user: { login: 'someone-else' }, body: encodeAttemptMarker({ reviewId: '500', headSha: SHA, round: 1 }) };
  assert.equal(reserveAttempt([forged], 501, SHA).round, 1);
});
