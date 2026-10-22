import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { encodeAttemptMarker } from './review-policy.mjs';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);
const DIR = dirname(fileURLToPath(import.meta.url));
const SHA = 'a'.repeat(40);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function git(cwd, args, options = {}) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-C', cwd, ...args], options);
}

async function repoFixture() {
  const root = await mkdtemp(join(tmpdir(), 'applyline-scripts-'));
  git(root, ['init', '-q']);
  await writeFile(join(root, 'hello.txt'), 'before\n');
  git(root, ['add', 'hello.txt']);
  git(root, ['commit', '-qm', 'base']);
  return root;
}

test('capture-patch asserts the reviewed SHA and captures bounded text changes', async () => {
  const root = await repoFixture();
  const directory = await mkdtemp(join(tmpdir(), 'applyline-capture-'));
  try {
    const head = git(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
    await writeFile(join(root, 'hello.txt'), 'after\n');
    const patchPath = join(directory, 'change.patch');
    const outputPath = join(directory, 'output.txt');
    await execFileAsync(process.execPath, [join(DIR, 'capture-patch.mjs')], {
      env: { ...process.env, WORKTREE_PATH: root, PATCH_FILE: patchPath, GITHUB_OUTPUT: outputPath, EXPECTED_HEAD_SHA: head },
    });
    assert.match(await readFile(patchPath, 'utf8'), /after/);
    await assert.rejects(execFileAsync(process.execPath, [join(DIR, 'capture-patch.mjs')], {
      env: { ...process.env, WORKTREE_PATH: root, PATCH_FILE: patchPath, GITHUB_OUTPUT: outputPath, EXPECTED_HEAD_SHA: SHA },
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('capture-patch rejects edits to an existing symlink even without a mode-change header', async () => {
  const root = await mkdtemp(join(tmpdir(), 'applyline-symlink-'));
  const directory = await mkdtemp(join(tmpdir(), 'applyline-symlink-capture-'));
  try {
    git(root, ['init', '-q']);
    await writeFile(join(root, 'target.txt'), 'target\n');
    await symlink('target.txt', join(root, 'link.txt'));
    git(root, ['add', 'target.txt', 'link.txt']);
    git(root, ['commit', '-qm', 'base']);
    const head = git(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
    await unlink(join(root, 'link.txt'));
    await symlink('other.txt', join(root, 'link.txt'));
    const patchPath = join(directory, 'change.patch');
    const outputPath = join(directory, 'output.txt');
    await assert.rejects(execFileAsync(process.execPath, [join(DIR, 'capture-patch.mjs')], {
      env: { ...process.env, WORKTREE_PATH: root, PATCH_FILE: patchPath, GITHUB_OUTPUT: outputPath, EXPECTED_HEAD_SHA: head },
    }), /Patches may not modify symlinks/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('prepare-patch applies only a digest-matched safe text patch', async () => {
  const root = await repoFixture();
  const directory = await mkdtemp(join(tmpdir(), 'applyline-prepare-'));
  try {
    const patch = Buffer.from('diff --git a/hello.txt b/hello.txt\nindex 3367afd..9ae9e30 100644\n--- a/hello.txt\n+++ b/hello.txt\n@@ -1 +1 @@\n-before\n+after\n');
    const patchPath = join(directory, 'change.patch');
    await writeFile(patchPath, patch);
    await execFileAsync(process.execPath, [join(DIR, 'prepare-patch.mjs')], {
      env: { ...process.env, WORKTREE_PATH: root, PATCH_FILE: patchPath, EXPECTED_PATCH_SHA256: sha256(patch) },
    });
    assert.equal(await readFile(join(root, 'hello.txt'), 'utf8'), 'after\n');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('copy-validated-patch preserves exact bytes and rejects a digest mismatch', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'applyline-copy-'));
  try {
    const source = join(directory, 'source.patch');
    const destination = join(directory, 'validated.patch');
    const patch = Buffer.from('trusted patch bytes\n');
    await writeFile(source, patch);
    await execFileAsync(process.execPath, [join(DIR, 'copy-validated-patch.mjs')], {
      env: { ...process.env, PATCH_FILE: source, VALIDATED_PATCH_FILE: destination, EXPECTED_PATCH_SHA256: sha256(patch) },
    });
    assert.deepEqual(await readFile(destination), patch);
    await assert.rejects(execFileAsync(process.execPath, [join(DIR, 'copy-validated-patch.mjs')], {
      env: { ...process.env, PATCH_FILE: source, VALIDATED_PATCH_FILE: destination, EXPECTED_PATCH_SHA256: '0'.repeat(64) },
    }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('publish-patch pushes only a digest-matched patch to the same requirement branch and cleans its worktree', async () => {
  const root = await repoFixture();
  const directory = await mkdtemp(join(tmpdir(), 'applyline-publish-'));
  const remote = join(directory, 'remote.git');
  const worktree = join(directory, 'publish-worktree');
  try {
    execFileSync('git', ['clone', '--bare', root, remote], { stdio: 'ignore' });
    git(root, ['remote', 'add', 'origin', remote]);
    const headSha = git(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
    execFileSync('git', ['--git-dir', remote, 'update-ref', 'refs/pull/7/head', headSha]);
    execFileSync('git', ['--git-dir', remote, 'update-ref', 'refs/heads/codex/req-001-fix', headSha]);
    await writeFile(join(root, 'hello.txt'), 'published\n');
    const patch = git(root, ['diff', '--no-ext-diff', '--no-renames', 'HEAD']);
    assert.ok(patch.length > 0, 'fixture should contain a text patch');
    const patchPath = join(directory, 'validated.patch');
    const outputPath = join(directory, 'output.txt');
    const statePath = join(directory, 'github.json');
    await writeFile(patchPath, patch);
    const reviewBody = '## Review: REQ-001\n\nPlease fix this behavior.\n\nVerdict: changes requested.';
    const marker = encodeAttemptMarker({ reviewId: '501', headSha, round: 1 });
    await writeFile(statePath, JSON.stringify({
      pullRequest: {
        number: 7, state: 'open', draft: false, user: { login: 'Limwalnut', id: 40132701 },
        head: { sha: headSha, ref: 'codex/req-001-fix', repo: { full_name: 'Limwalnut/job-tracker' } },
        base: { ref: 'main' }, title: 'REQ-001: test publish', body: 'REQ-001',
      },
      reviews: [{ id: 501, user: { login: 'Limwalnut', id: 40132701 }, commit_id: headSha, submitted_at: '2026-10-22T12:00:00Z', state: 'COMMENTED', body: reviewBody }],
      files: [{ filename: 'hello.txt' }],
      comments: [{ user: { login: 'github-actions[bot]' }, body: marker }],
      postCount: 0,
    }));
    const result = await execFileAsync(process.execPath, [
      `--import=${join(DIR, 'mock-github-fetch.mjs')}`, join(DIR, 'publish-patch.mjs'),
    ], {
      env: {
        ...process.env, GITHUB_TOKEN: 'test-token', GITHUB_REPOSITORY: 'Limwalnut/job-tracker',
        PR_NUMBER: '7', EXPECTED_HEAD_SHA: headSha, EXPECTED_REVIEW_ID: '501', ROUND: '1',
        EXPECTED_PATCH_SHA256: sha256(patch), CONTROL_PATH: root, WORKTREE_PATH: worktree,
        PATCH_FILE: patchPath, GITHUB_OUTPUT: outputPath, GITHUB_MOCK_STATE: statePath,
      },
    });
    assert.match(result.stdout, /were pushed/);
    const output = await readFile(outputPath, 'utf8');
    const publishedSha = output.match(/published_sha=([a-f0-9]{40})/)?.[1];
    assert.ok(publishedSha);
    assert.equal(execFileSync('git', ['--git-dir', remote, 'rev-parse', 'refs/heads/codex/req-001-fix'], { encoding: 'utf8' }).trim(), publishedSha);
    await assert.rejects(stat(worktree));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
