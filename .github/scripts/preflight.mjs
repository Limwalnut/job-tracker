import { readFile, writeFile } from 'node:fs/promises';
import { isEligibleReview, latestMatchingReview } from './review-policy.mjs';
import { pullRequestSnapshot } from './github-api.mjs';

async function main() {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_EVENT_PATH: eventPath } = process.env;
  const expectedSha = process.env.EXPECTED_HEAD_SHA;
  const expectedReviewId = process.env.EXPECTED_REVIEW_ID;
  const number = process.env.PR_NUMBER;
  if (!token || !eventPath || !/^[a-f0-9]{40}$/i.test(expectedSha ?? '') || !/^\d+$/.test(number ?? '')) {
    throw new Error('Preflight context is incomplete.');
  }
  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  const snapshot = await pullRequestSnapshot(repository, number, token);
  const review = snapshot.reviews.find((item) => String(item.id) === String(expectedReviewId));
  if (event.review?.user?.id !== 40132701 || review?.user?.id !== 40132701 || event.review.user.id !== review.user.id) {
    throw new Error('Preflight stopped because the event reviewer did not match the PM identity in the GitHub API.');
  }
  const latestReview = latestMatchingReview(snapshot.reviews);
  const eligibility = isEligibleReview({
    repository,
    pullRequest: snapshot.pullRequest,
    review,
    latestReview,
    changedPaths: snapshot.changedFiles.map((file) => file.filename),
  });
  if (!eligibility.eligible || snapshot.pullRequest.head.sha !== expectedSha || event.review?.commit_id !== expectedSha) {
    throw new Error('Preflight stopped because the PR head or latest eligible review changed before the model run.');
  }

  const feedback = {
    requirementId: eligibility.requirementId,
    pullRequest: { title: snapshot.pullRequest.title, body: snapshot.pullRequest.body ?? '' },
    review: { body: review.body },
    baseSha: snapshot.pullRequest.base.sha,
    headSha: snapshot.pullRequest.head.sha,
  };
  await writeFile(process.env.FEEDBACK_FILE, JSON.stringify(feedback, null, 2), { mode: 0o600 });
  console.log('Preflight passed. Review content was saved for the model without printing it to logs.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
