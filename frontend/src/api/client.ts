export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getErrorMessage(problem: unknown, status: number): string {
  if (typeof problem === 'object' && problem !== null) {
    if ('errors' in problem && typeof problem.errors === 'object' && problem.errors !== null) {
      const messages = Object.values(problem.errors)
        .flatMap((value: unknown) => Array.isArray(value) ? value : [])
        .filter((value: unknown): value is string => typeof value === 'string');
      if (messages.length > 0) return messages.join(' ');
    }
    if ('title' in problem && typeof problem.title === 'string' && problem.title) {
      return problem.title;
    }
  }
  return `Request failed (HTTP ${status}).`;
}

async function send(path: string, options: RequestInit): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) {
    const problem: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, getErrorMessage(problem, response.status));
  }
  return response;
}

// Generic types describe the API contract; they do not validate response JSON.
export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await send(path, options);
  return response.json() as Promise<T>;
}

// Commands returning 204 must not attempt to parse an empty response body.
export async function requestVoid(
  path: string,
  options: RequestInit = {},
): Promise<void> {
  await send(path, options);
}
