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

export function login(email: string, password: string) {
  return requestVoid('/auth/login?useCookies=true', {
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