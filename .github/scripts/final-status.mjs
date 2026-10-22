import { postIssueComment } from './github-api.mjs';

const repository = process.env.GITHUB_REPOSITORY;
const number = process.env.PR_NUMBER;
const token = process.env.GITHUB_TOKEN;
const round = Number(process.env.ROUND);
const publishedSha = process.env.PUBLISHED_SHA;
const gateResult = process.env.GATE_RESULT;
const modelResult = process.env.MODEL_RESULT;
const validateResult = process.env.VALIDATE_RESULT;
const publishResult = process.env.PUBLISH_RESULT;
const publishOutput = process.env.PUBLISH_OUTPUT;

async function main() {
  if (!token || !/^\d+$/.test(number ?? '') || !Number.isInteger(round) || round < 1 || round > 3) {
    throw new Error('Final status context is incomplete.');
  }
  let status;
  if (/^[a-f0-9]{40}$/i.test(publishedSha ?? '')) status = `pushed ${publishedSha}`;
  else if (publishResult === 'success' && publishOutput === 'no-changes') status = 'no changes';
  else {
    const failedJob = gateResult !== 'success' ? 'gate' : modelResult !== 'success' ? 'model' : validateResult !== 'success' ? 'validate' : 'publish';
    status = `failed in ${failedJob}`;
  }
  await postIssueComment(repository, number, token, `attempt ${round}/3: ${status}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
