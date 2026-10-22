export const EXPECTED_REPOSITORY = 'Limwalnut/job-tracker';
export const EXPECTED_REVIEWER = 'Limwalnut';
export const MAX_ATTEMPTS = 3;
export const ATTEMPT_MARKER = '<!-- applyline-review-autofix-attempt:v1:';
export const HANDOFF_MARKER = '<!-- applyline-review-autofix-handoff:v1 -->';

export function parseReviewHeader(body) {
  if (typeof body !== 'string') return null;
  const match = body.match(/^## Review: (REQ-\d{3,})(?:\s|$)/);
  return match ? match[1] : null;
}

export function parseReviewVerdict(body) {
  if (typeof body !== 'string') return { verdict: null, reason: 'missing_body' };
  let insideFence = false;
  const lines = body.split(/\r?\n/).filter((line) => {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      return false;
    }
    return !insideFence && !/^\s*<!--/.test(line) && /\bVerdict\b/i.test(line);
  });
  if (lines.length !== 1) return { verdict: null, reason: lines.length ? 'multiple_or_malformed_verdict_lines' : 'missing_verdict' };

  const line = lines[0].trim();
  const match = line.match(/^(?:\*\*)?Verdict:\s*(changes requested|ready)\.?(?:\*\*)?$/i);
  if (!match) return { verdict: null, reason: 'malformed_verdict' };
  return { verdict: match[1].toLowerCase() === 'ready' ? 'ready' : 'changes_requested', reason: null };
}

export function matchesRequirement(body, title, prBody) {
  const requirementId = parseReviewHeader(body);
  if (!requirementId) return null;
  const escaped = requirementId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const occurrence = new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, 'i');
  return occurrence.test(title ?? '') || occurrence.test(prBody ?? '') ? requirementId : null;
}

export function latestMatchingReview(reviews) {
  return reviews
    .filter((review) => review.user?.login === EXPECTED_REVIEWER && parseReviewHeader(review.body))
    .sort((a, b) => Date.parse(b.submitted_at ?? 0) - Date.parse(a.submitted_at ?? 0) || Number(b.id) - Number(a.id))[0] ?? null;
}

export function isEligibleReview({ repository, pullRequest, review, latestReview, changedPaths }) {
  const reject = (reason) => ({ eligible: false, reason });
  if (repository !== EXPECTED_REPOSITORY) return reject('wrong_repository');
  if (!pullRequest || pullRequest.state !== 'open' || pullRequest.draft) return reject('pull_request_not_open');
  if (pullRequest.user?.login !== EXPECTED_REVIEWER) return reject('wrong_pull_request_author');
  if (pullRequest.head?.repo?.full_name !== EXPECTED_REPOSITORY) return reject('fork_pull_request');
  if (pullRequest.base?.ref !== 'main') return reject('wrong_base_branch');
  if (!pullRequest.head?.ref?.startsWith('codex/')) return reject('branch_not_codex_prefix');
  if (changedPaths.some(isProtectedPath)) return reject('automation_or_secret_paths_changed');
  if (!review || review.user?.login !== EXPECTED_REVIEWER) return reject('wrong_reviewer');
  if (!latestReview || Number(latestReview.id) !== Number(review.id)) return reject('review_not_latest');
  if (review.commit_id !== pullRequest.head.sha) return reject('stale_review_commit');
  if (review.state?.toUpperCase() === 'DISMISSED') return reject('review_dismissed');

  const requirementId = matchesRequirement(review.body, pullRequest.title, pullRequest.body);
  if (!requirementId) return reject('requirement_id_not_matched');
  const parsed = parseReviewVerdict(review.body);
  if (!parsed.verdict) return reject(parsed.reason);
  if (parsed.verdict !== 'changes_requested') return reject('review_is_ready');
  return { eligible: true, reason: null, requirementId };
}

export function isProtectedPath(path) {
  const normalized = String(path).replaceAll('\\', '/').replace(/^\.\//, '');
  const lower = normalized.toLowerCase();
  return lower === '.github' || lower.startsWith('.github/') ||
    lower === '.codex' || lower.startsWith('.codex/') ||
    lower === 'agents.md' || lower.endsWith('/agents.md') ||
    lower === '.env' || lower.startsWith('.env.') || lower.endsWith('/.env') || lower.includes('/.env.') ||
    /(^|\/)(secrets?|credentials?)(\/|$)/.test(lower) ||
    /(^|\/)[^/]*(secret|credential|private[-_]?key)[^/]*$/.test(lower) ||
    /\.(pem|p12|pfx|key)$/i.test(lower) ||
    lower.split('/').some((part) => ['.git', 'node_modules', 'bin', 'obj', 'dist', 'dist-ssr'].includes(part));
}

export function decodeAttemptMarker(body) {
  if (typeof body !== 'string') return null;
  const match = body.match(/<!-- applyline-review-autofix-attempt:v1:([A-Za-z0-9_-]+) -->/);
  if (!match) return null;
  try {
    const json = Buffer.from(match[1], 'base64url').toString('utf8');
    const value = JSON.parse(json);
    if (!Number.isInteger(value.round) || value.round < 1 || value.round > MAX_ATTEMPTS || !value.reviewId || !/^[a-f0-9]{40}$/i.test(value.headSha)) return null;
    return value;
  } catch {
    return null;
  }
}

export function encodeAttemptMarker(value) {
  return `${ATTEMPT_MARKER}${Buffer.from(JSON.stringify(value)).toString('base64url')} -->`;
}

export function reserveAttempt(comments, reviewId, headSha, runId, runAttempt) {
  const botComments = comments.filter((comment) => comment.user?.login === 'github-actions[bot]');
  const attempts = botComments.map((comment) => decodeAttemptMarker(comment.body)).filter(Boolean);
  if (attempts.some((attempt) => String(attempt.reviewId) === String(reviewId))) return { action: 'duplicate', attempts };
  if (attempts.length >= MAX_ATTEMPTS) {
    return { action: botComments.some((comment) => comment.body?.includes(HANDOFF_MARKER)) ? 'capped' : 'handoff', attempts };
  }
  return {
    action: 'reserve',
    round: attempts.length + 1,
    attempts,
    marker: encodeAttemptMarker({ reviewId: String(reviewId), headSha, round: attempts.length + 1, runId: String(runId ?? ''), runAttempt: String(runAttempt ?? '') }),
  };
}
