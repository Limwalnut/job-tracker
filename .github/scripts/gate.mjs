import { appendFile, readFile } from 'node:fs/promises';
import { isEligibleReview, latestMatchingReview, reserveAttempt, HANDOFF_MARKER, MAX_ATTEMPTS } from './review-policy.mjs';
import { pullRequestSnapshot, postIssueComment } from './github-api.mjs';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const eventPath = process.env.GITHUB_EVENT_PATH;
const outputPath = process.env.GITHUB_OUTPUT;
const missingKeyMarker = '<!-- applyline-review-autofix-missing-key:v1 -->';

function output(name, value) {
  if (!outputPath) throw new Error('GitHub Actions output file is unavailable.');
  return appendFile(outputPath, `${name}=${String(value)}\n`);
}

async function readEvent() {
  if (!eventPath) throw new Error('GitHub event payload is unavailable.');
  return JSON.parse(await readFile(eventPath, 'utf8'));
}

async function main() {
  if (!token || !runId) throw new Error('GitHub Actions context is incomplete.');
  const event = await readEvent();
  const number = event.pull_request?.number;
  const eventReview = event.review;
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request_review' || event.action !== 'submitted' || !number || !eventReview?.id) {
    await output('eligible', 'false');
    console.log('Skipped: event is not a submitted pull request review.');
    return;
  }

  let snapshot = await pullRequestSnapshot(repository, number, token);
  let latestReview = latestMatchingReview(snapshot.reviews);
  let currentReview = snapshot.reviews.find((review) => String(review.id) === String(eventReview.id));
  let eligibility = isEligibleReview({
    repository,
    pullRequest: snapshot.pullRequest,
    review: currentReview,
    latestReview,
    changedPaths: snapshot.changedFiles.map((file) => file.filename),
  });
  if (!eligibility.eligible) {
    await output('eligible', 'false');
    console.log(`Skipped: ${eligibility.reason}.`);
    return;
  }

  if (process.env.HAS_OPENAI_API_KEY !== 'true') {
    if (!snapshot.comments.some((comment) => comment.user?.login === 'github-actions[bot]' && comment.body?.includes(missingKeyMarker))) {
      await postIssueComment(repository, number, token, `${missingKeyMarker}\n\nThe review-fix workflow is enabled, but it cannot run because the repository secret OPENAI_API_KEY is not configured. Add that secret in the repository Actions settings, then submit a new PM review to start an attempt. This did not consume an automatic attempt.`);
    }
    await output('eligible', 'false');
    throw new Error('OPENAI_API_KEY is missing. Add the repository secret; no attempt was reserved.');
  }

  // Re-read immediately before reserving so stale queued review events cannot spend an attempt.
  const observedSha = snapshot.pullRequest.head.sha;
  snapshot = await pullRequestSnapshot(repository, number, token);
  latestReview = latestMatchingReview(snapshot.reviews);
  currentReview = snapshot.reviews.find((review) => String(review.id) === String(eventReview.id));
  const currentSha = snapshot.pullRequest.head.sha;
  eligibility = isEligibleReview({
    repository,
    pullRequest: snapshot.pullRequest,
    review: currentReview,
    latestReview,
    changedPaths: snapshot.changedFiles.map((file) => file.filename),
  });
  if (!eligibility.eligible || currentSha !== observedSha) {
    await output('eligible', 'false');
    console.log('Skipped: review or PR head changed before attempt reservation.');
    return;
  }

  const reservation = reserveAttempt(snapshot.comments, eventReview.id, currentSha, runId, process.env.GITHUB_RUN_ATTEMPT);
  if (reservation.action === 'duplicate') {
    await output('eligible', 'false');
    console.log('Skipped: this review already has a reserved attempt.');
    return;
  }
  if (reservation.action === 'handoff') {
    await postIssueComment(repository, number, token, `${HANDOFF_MARKER}\n\nAutomatic review fixes have reached the limit of ${MAX_ATTEMPTS} attempts for this pull request. Please resolve any remaining feedback manually; no merge or deployment was performed.`);
    await output('eligible', 'false');
    console.log('Stopped: automatic attempt limit reached; posted one handoff comment.');
    return;
  }
  if (reservation.action === 'capped') {
    await output('eligible', 'false');
    console.log('Stopped: automatic attempt limit was already reached.');
    return;
  }

  const round = reservation.round;
  await postIssueComment(repository, number, token, `${reservation.marker}\n\nReserved automatic review-fix attempt ${round}/${MAX_ATTEMPTS} for this review. A failed run still counts toward the limit.`);
  const controlSha = process.env.TRUSTED_CONTROL_SHA;
  if (!/^[a-f0-9]{40}$/i.test(controlSha ?? '')) throw new Error('Trusted workflow revision is invalid.');
  await output('eligible', 'true');
  await output('round', round);
  await output('head_sha', currentSha);
  await output('branch', snapshot.pullRequest.head.ref);
  await output('review_id', eventReview.id);
  await output('requirement_id', eligibility.requirementId);
  await output('control_sha', controlSha);
  await output('pr_number', number);
  console.log(`Reserved attempt ${round}/${MAX_ATTEMPTS} for PR #${number}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
