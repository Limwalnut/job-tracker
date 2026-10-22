import test from 'node:test';
import assert from 'node:assert/strict';
import { githubRequest } from './github-api.mjs';

test('GitHub API errors expose a safe target and bounded diagnostics without echoing secrets or response bodies', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    message: 'Resource not accessible by integration',
    token: 'response-secret',
    details: 'untrusted response text',
  }), {
    status: 403,
    headers: {
      'x-github-request-id': 'ABC123:DEF456',
      'x-accepted-github-permissions': 'issues=read, pull_requests=write, secrets=write, garbage, contents=admin',
    },
  });
  try {
    await assert.rejects(
      githubRequest('/repos/owner/repo/issues/7/comments?access_token=query-secret', 'header-secret', { method: 'POST' }),
      (error) => {
        assert.match(error.message, /^GitHub API POST \/repos\/owner\/repo\/issues\/7\/comments failed with HTTP 403/);
        assert.match(error.message, /request-id=ABC123:DEF456/);
        assert.match(error.message, /accepted-permissions=issues:read,pull-requests:write/);
        assert.match(error.message, /message="Resource not accessible by integration"/);
        assert.doesNotMatch(error.message, /query-secret|header-secret|response-secret|untrusted|secrets|admin/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unrecognized GitHub messages, request ids, and permission values are omitted', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'private detail from upstream' }), {
    status: 403,
    headers: {
      'x-github-request-id': 'secret request id',
      'x-accepted-github-permissions': 'contents=admin, packages=write',
    },
  });
  try {
    await assert.rejects(githubRequest('/repos/owner/repo/pulls/7', 'token'), (error) => {
      assert.match(error.message, /^GitHub API GET \/repos\/owner\/repo\/pulls\/7 failed with HTTP 403\.$/);
      assert.doesNotMatch(error.message, /private detail|secret|packages|admin/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
