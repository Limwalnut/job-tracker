const API_ROOT = 'https://api.github.com';

const SAFE_GITHUB_MESSAGES = new Set([
  'Bad credentials',
  'Not Found',
  'Resource not accessible by integration',
  'API rate limit exceeded',
  'Validation Failed',
  'Problems parsing JSON',
]);
const SAFE_METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']);

function safeRequestPath(path) {
  try {
    const url = new URL(path, API_ROOT);
    if (url.origin !== API_ROOT || !/^\/[A-Za-z0-9_/-]{1,200}$/.test(url.pathname)) return '<invalid-path>';
    return url.pathname;
  } catch {
    return '<invalid-path>';
  }
}

function safeAcceptedPermissions(value) {
  const allowed = new Map([
    ['contents', 'contents'],
    ['issues', 'issues'],
    ['pull_requests', 'pull-requests'],
    ['pull-requests', 'pull-requests'],
  ]);
  return String(value ?? '').split(',').flatMap((item) => {
    const match = item.trim().match(/^([a-z_-]+)\s*=\s*(read|write|none)$/i);
    if (!match) return [];
    const scope = allowed.get(match[1].toLowerCase());
    return scope ? [`${scope}:${match[2].toLowerCase()}`] : [];
  }).slice(0, 4).join(',');
}

function githubError(response, method, path, body) {
  const parts = [`GitHub API ${method} ${safeRequestPath(path)} failed with HTTP ${response.status}`];
  const requestId = response.headers.get('x-github-request-id');
  if (requestId && /^[A-Fa-f0-9:-]{1,80}$/.test(requestId)) parts.push(`request-id=${requestId}`);
  const permissions = safeAcceptedPermissions(response.headers.get('x-accepted-github-permissions'));
  if (permissions) parts.push(`accepted-permissions=${permissions}`);
  if (body && SAFE_GITHUB_MESSAGES.has(body.message)) parts.push(`message="${body.message}"`);
  return new Error(`${parts.join('; ')}.`);
}

export async function githubRequest(path, token, options = {}) {
  const requestedMethod = String(options.method ?? 'GET').toUpperCase();
  const method = SAFE_METHODS.has(requestedMethod) ? requestedMethod : '<invalid-method>';
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let body;
    try { body = await response.json(); } catch { /* Error responses are optional diagnostics only. */ }
    throw githubError(response, method, path, body);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function githubList(path, token) {
  const results = [];
  for (let page = 1; page <= 100; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const values = await githubRequest(`${path}${separator}per_page=100&page=${page}`, token);
    if (!Array.isArray(values)) throw new Error('GitHub API returned an unexpected collection.');
    results.push(...values);
    if (values.length < 100) return results;
  }
  throw new Error('GitHub API pagination exceeded the safety limit.');
}

export function repositoryPath(repository) {
  const [owner, name] = String(repository ?? '').split('/');
  if (!owner || !name || owner.includes('/') || name.includes('/')) throw new Error('Invalid repository name.');
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

export async function pullRequestSnapshot(repository, number, token) {
  if (!/^\d+$/.test(String(number))) throw new Error('Invalid pull request number.');
  const base = `${repositoryPath(repository)}/pulls/${number}`;
  const pullRequest = await githubRequest(base, token);
  const [reviews, changedFiles, comments] = await Promise.all([
    githubList(`${base}/reviews`, token),
    githubList(`${base}/files`, token),
    githubList(`${repositoryPath(repository)}/issues/${number}/comments`, token),
  ]);
  return { pullRequest, reviews, changedFiles, comments };
}

export async function postIssueComment(repository, number, token, body) {
  return githubRequest(`${repositoryPath(repository)}/issues/${number}/comments`, token, {
    method: 'POST', body: JSON.stringify({ body }),
  });
}
