import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('workflow pins every external action to a full 40-character commit SHA', async () => {
  const workflow = await readFile(join(ROOT, 'workflows', 'review-autofix.yml'), 'utf8');
  const refs = [...workflow.matchAll(/^\s+uses:\s+[^\s@]+@([^\s#]+)(?:\s+#.*)?$/gm)].map((match) => match[1]);
  assert.ok(refs.length > 0, 'workflow should use pinned actions');
  for (const ref of refs) assert.match(ref, /^[a-f0-9]{40}$/i, `invalid action pin: ${ref}`);
  assert.match(workflow, /actions\/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f/);
});

test('workflow reserves attempts only behind the PM event prefilter and serializes trusted gates', async () => {
  const workflow = await readFile(join(ROOT, 'workflows', 'review-autofix.yml'), 'utf8');
  assert.match(workflow, /github\.event\.review\.user\.id == 40132701/);
  assert.match(workflow, /concurrency:\s*\n\s+group: pm-review-autofix-\$\{\{ github\.event\.pull_request\.number \}\}/);
  assert.doesNotMatch(workflow, /^concurrency:/m);
  assert.match(workflow, /ref: \$\{\{ needs\.gate\.outputs\.head_sha \}\}/);
  assert.match(workflow, /codex-version: 0\.163\.0/);
  assert.match(workflow, /name: Shut down the Codex API key proxy\n\s+if: always\(\)/);
  assert.match(workflow, /name: Post fixed attempt status/);
});

test('only the gate and final status jobs can write pull request comments', async () => {
  const workflow = await readFile(join(ROOT, 'workflows', 'review-autofix.yml'), 'utf8');
  const gate = workflow.match(/^  gate:\n([\s\S]*?)(?=^  model:)/m)?.[1];
  const finalStatus = workflow.slice(workflow.indexOf('  final-status:\n'));
  assert.ok(gate);
  assert.ok(finalStatus.startsWith('  final-status:\n'));
  assert.ok(gate.includes('    permissions:\n      contents: read\n      pull-requests: write\n'));
  assert.doesNotMatch(gate, /issues: write/);
  assert.ok(finalStatus.includes('    permissions:\n      contents: read\n      pull-requests: write\n'));
  assert.doesNotMatch(finalStatus, /issues: write/);
  const model = workflow.match(/^  model:\n([\s\S]*?)(?=^  validate:)/m)?.[1];
  assert.ok(model);
  assert.ok(model.includes('    permissions:\n      contents: read\n      pull-requests: read\n      issues: read\n'));
  assert.doesNotMatch(model, /^\s+[a-z-]+: write\s*$/m);
});
