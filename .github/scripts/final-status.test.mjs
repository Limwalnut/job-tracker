import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);
const DIR = dirname(fileURLToPath(import.meta.url));

test('final status comment uses only fixed-template outcome fields', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'applyline-status-'));
  try {
    const statePath = join(directory, 'github.json');
    const sha = 'd'.repeat(40);
    await writeFile(statePath, JSON.stringify({ pullRequest: {}, reviews: [], files: [], comments: [], postCount: 0 }));
    await execFileAsync(process.execPath, [
      `--import=${join(DIR, 'mock-github-fetch.mjs')}`, join(DIR, 'final-status.mjs'),
    ], {
      env: {
        ...process.env, GITHUB_TOKEN: 'test-token', GITHUB_REPOSITORY: 'Limwalnut/job-tracker',
        PR_NUMBER: '7', ROUND: '2', PUBLISHED_SHA: sha, PUBLISH_RESULT: 'success',
        GATE_RESULT: 'success', MODEL_RESULT: 'success', VALIDATE_RESULT: 'success',
        PUBLISH_OUTPUT: '', GITHUB_MOCK_STATE: statePath,
      },
    });
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(state.comments[0].body, `attempt 2/3: pushed ${sha}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
