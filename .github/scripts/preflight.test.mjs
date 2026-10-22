import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);
const DIR = dirname(fileURLToPath(import.meta.url));
const SHA = 'a'.repeat(40);

test('preflight checks API reviewer identity and exact reviewed head before writing model context', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'applyline-preflight-'));
  try {
    const statePath = join(directory, 'github.json');
    const eventPath = join(directory, 'event.json');
    const feedbackPath = join(directory, 'feedback.json');
    const review = { id: 501, user: { login: 'Limwalnut', id: 40132701 }, commit_id: SHA, submitted_at: '2026-10-22T12:00:00Z', state: 'COMMENTED', body: '## Review: REQ-001\n\nVerdict: changes requested.' };
    await writeFile(statePath, JSON.stringify({
      pullRequest: { number: 7, state: 'open', draft: false, user: { login: 'Limwalnut', id: 40132701 }, head: { sha: SHA, ref: 'codex/req-001-fix', repo: { full_name: 'Limwalnut/job-tracker' } }, base: { ref: 'main', sha: 'b'.repeat(40) }, title: 'REQ-001: work', body: 'REQ-001' },
      reviews: [review], files: [{ filename: 'hello.txt' }], comments: [], postCount: 0,
    }));
    await writeFile(eventPath, JSON.stringify({ review: { ...review, user: { login: 'someone-else', id: 7 } } }));
    await assert.rejects(execFileAsync(process.execPath, [
      `--import=${join(DIR, 'mock-github-fetch.mjs')}`, join(DIR, 'preflight.mjs'),
    ], {
      env: {
        ...process.env, GITHUB_TOKEN: 'test-token', GITHUB_REPOSITORY: 'Limwalnut/job-tracker',
        GITHUB_EVENT_PATH: eventPath, PR_NUMBER: '7', EXPECTED_HEAD_SHA: SHA,
        EXPECTED_REVIEW_ID: '501', FEEDBACK_FILE: feedbackPath, GITHUB_MOCK_STATE: statePath,
      },
    }), /event reviewer did not match/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
