import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);
const SHA = 'a'.repeat(40);
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REVIEW_BODY = '## Review: REQ-001\n\nPlease update this behavior.\n\n**Verdict: changes requested.**';

function makePr(headSha = SHA) {
  return {
    number: 7,
    state: 'open',
    draft: false,
    user: { login: 'Limwalnut', id: 40132701 },
    head: { sha: headSha, ref: 'codex/req-001-fix', repo: { full_name: 'Limwalnut/job-tracker' } },
    base: { ref: 'main', sha: 'b'.repeat(40) },
    title: 'REQ-001: update account tokens',
    body: 'Implements REQ-001.',
  };
}

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'applyline-gate-test-'));
  const statePath = join(directory, 'mock-state.json');
  const state = {
    pullRequest: makePr(),
    reviews: [{ id: 501, user: { login: 'Limwalnut', id: 40132701 }, commit_id: SHA, submitted_at: '2026-10-22T12:00:00Z', state: 'COMMENTED', body: REVIEW_BODY }],
    files: [{ filename: 'backend/Service.cs' }],
    comments: [],
    postCount: 0,
  };
  await writeFile(statePath, JSON.stringify(state));
  return { directory, statePath };
}

async function invokeGate({ directory, statePath }, { hasKey = 'true', reviewBody = REVIEW_BODY, eventId = 501, reviewerId = 40132701, controlSha = 'c'.repeat(40) } = {}) {
  const eventPath = join(directory, 'event.json');
  const outputPath = join(directory, `outputs-${Date.now()}-${Math.random()}.txt`);
  await writeFile(eventPath, JSON.stringify({
    action: 'submitted',
    repository: { full_name: 'Limwalnut/job-tracker' },
    pull_request: { number: 7 },
    review: { id: eventId, user: { login: 'Limwalnut', id: reviewerId }, commit_id: SHA, body: reviewBody },
  }));
  try {
    const result = await execFileAsync(process.execPath, [`--import=${join(SCRIPT_DIR, 'mock-github-fetch.mjs')}`, join(SCRIPT_DIR, 'gate.mjs')], {
      env: {
        ...process.env,
        GITHUB_TOKEN: 'test-token',
        GITHUB_REPOSITORY: 'Limwalnut/job-tracker',
        GITHUB_EVENT_NAME: 'pull_request_review',
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_RUN_ID: '123456',
        GITHUB_OUTPUT: outputPath,
        TRUSTED_CONTROL_SHA: controlSha,
        HAS_OPENAI_API_KEY: hasKey,
        GITHUB_MOCK_STATE: statePath,
      },
    });
    return { output: await readFile(outputPath, 'utf8'), stdout: result.stdout };
  } catch (error) {
    return { output: await readFile(outputPath, 'utf8').catch(() => ''), error };
  }
}

async function stateFor(context) {
  return JSON.parse(await readFile(context.statePath, 'utf8'));
}

async function updateState(context, update) {
  const state = await stateFor(context);
  update(state);
  await writeFile(context.statePath, JSON.stringify(state));
}

test('gate reserves before spending, deduplicates reruns, and uses the canonical latest review', async () => {
  const context = await setup();
  try {
    const first = await invokeGate(context);
    assert.match(first.output, /eligible=true/);
    assert.match(first.output, /round=1/);
    assert.match(first.output, new RegExp(`head_sha=${SHA}`));
    assert.equal((await stateFor(context)).postCount, 1);

    const duplicate = await invokeGate(context);
    assert.match(duplicate.output, /eligible=false/);
    assert.equal((await stateFor(context)).postCount, 1);

    await updateState(context, (state) => {
      state.reviews[0] = { ...state.reviews[0], body: '## Review: REQ-001\n\nVerdict: ready.' };
    });
    const nowReady = await invokeGate(context);
    assert.match(nowReady.output, /eligible=false/);
    assert.equal((await stateFor(context)).postCount, 1);
  } finally {
    await rm(context.directory, { recursive: true, force: true });
  }
});

test('missing API key fails clearly without reserving an attempt', async () => {
  const context = await setup();
  try {
    const result = await invokeGate(context, { hasKey: 'false' });
    assert.match(result.error?.stderr?.toString() ?? '', /OPENAI_API_KEY is missing/);
    assert.match(result.output, /eligible=false/);
    const state = await stateFor(context);
    assert.equal(state.postCount, 1);
    assert.match(state.comments[0].body, /did not consume an automatic attempt/);
  } finally {
    await rm(context.directory, { recursive: true, force: true });
  }
});

test('gate rejects a reviewer identity that differs from the authenticated API review', async () => {
  const context = await setup();
  try {
    const result = await invokeGate(context, { reviewerId: 7 });
    assert.match(result.output, /eligible=false/);
    assert.equal((await stateFor(context)).postCount, 0);
  } finally {
    await rm(context.directory, { recursive: true, force: true });
  }
});

test('gate rejects a PR head that changes between the two API snapshots', async () => {
  const context = await setup();
  try {
    await updateState(context, (state) => { state.changeHeadOnPullFetch = 2; });
    const result = await invokeGate(context);
    assert.match(result.output, /eligible=false/);
    assert.equal((await stateFor(context)).postCount, 0);
  } finally {
    await rm(context.directory, { recursive: true, force: true });
  }
});

test('gate validates its trusted control SHA before reserving an attempt', async () => {
  const context = await setup();
  try {
    const result = await invokeGate(context, { controlSha: 'invalid' });
    assert.match(result.error?.stderr?.toString() ?? '', /Trusted workflow revision is invalid/);
    assert.equal((await stateFor(context)).postCount, 0);
  } finally {
    await rm(context.directory, { recursive: true, force: true });
  }
});
