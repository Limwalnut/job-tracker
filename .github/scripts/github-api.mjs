const API_ROOT = 'https://api.github.com';

export async function githubRequest(path, token, options = {}) {
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
  if (!response.ok) throw new Error(`GitHub API request failed with HTTP ${response.status}.`);
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
