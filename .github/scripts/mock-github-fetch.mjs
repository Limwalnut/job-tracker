import { readFileSync, writeFileSync } from 'node:fs';

const statePath = process.env.GITHUB_MOCK_STATE;
if (statePath) {
  globalThis.fetch = async (input, options = {}) => {
    const request = new URL(String(input));
    if (options.headers?.Authorization !== 'Bearer test-token') return new Response('{"message":"unauthorized"}', { status: 401 });
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    let value;
    if (options.method === 'POST' && request.pathname === '/repos/Limwalnut/job-tracker/issues/7/comments') {
      state.postCount += 1;
      value = { id: state.postCount, user: { login: 'github-actions[bot]' }, body: JSON.parse(options.body).body };
      state.comments.push(value);
      writeFileSync(statePath, JSON.stringify(state));
    } else if (request.pathname === '/repos/Limwalnut/job-tracker/pulls/7' && (!options.method || options.method === 'GET')) {
      state.pullFetchCount = (state.pullFetchCount ?? 0) + 1;
      if (state.pullFetchCount === state.changeHeadOnPullFetch) state.pullRequest.head.sha = 'd'.repeat(40);
      writeFileSync(statePath, JSON.stringify(state));
      value = state.pullRequest;
    }
    else if (request.pathname === '/repos/Limwalnut/job-tracker/pulls/7/reviews' && (!options.method || options.method === 'GET')) value = state.reviews;
    else if (request.pathname === '/repos/Limwalnut/job-tracker/pulls/7/files' && (!options.method || options.method === 'GET')) value = state.files;
    else if (request.pathname === '/repos/Limwalnut/job-tracker/issues/7/comments' && (!options.method || options.method === 'GET')) value = state.comments;
    else return new Response('{"message":"not found"}', { status: 404 });
    return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}
