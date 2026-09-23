import { requestJson, requestVoid } from './client';

export interface CurrentUser {
  id: string;
  email: string;
}

export function register(email: string, password: string) {
  return requestVoid('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(
  email: string,
  password: string,
  rememberMe: boolean,
) {
  const cookieMode = rememberMe
    ? 'useCookies=true'
    : 'useSessionCookies=true';

  return requestVoid(`/auth/login?${cookieMode}`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser() {
  return requestJson<CurrentUser>('/auth/me');
}

export function logout() {
  return requestVoid('/auth/logout', {
    method: 'POST',
  });
}

export function requestPasswordReset(email: string) {
  return requestVoid('/auth/forgotPassword', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  email: string,
  resetCode: string,
  newPassword: string,
) {
  return requestVoid('/auth/resetPassword', {
    method: 'POST',
    body: JSON.stringify({ email, resetCode, newPassword }),
  });
}
